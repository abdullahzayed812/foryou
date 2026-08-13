import axios, { type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/features/auth/store";
import { toApiError } from "./api-error";
import { API_URL } from "./api-url";

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // sends the HttpOnly refresh_token cookie
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

// Single-flight refresh: concurrent 401s from several in-flight requests
// share one /auth/refresh call instead of racing each other.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  refreshPromise ??= axios
    .post<{ accessToken: string }>(`${API_URL}/auth/refresh`, null, { withCredentials: true })
    .then((res) => res.data.accessToken)
    .catch(() => null)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    const apiError = toApiError(error);
    const config = axios.isAxiosError(error)
      ? (error.config as RetryableConfig | undefined)
      : undefined;

    const isAuthRoute =
      config?.url?.includes("/auth/login") || config?.url?.includes("/auth/refresh");
    if (apiError.status === 401 && config && !config._retried && !isAuthRoute) {
      config._retried = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        useAuthStore.getState().setAccessToken(newToken);
        config.headers.set("Authorization", `Bearer ${newToken}`);
        return apiClient(config);
      }
      useAuthStore.getState().clear();
    }

    throw apiError;
  },
);

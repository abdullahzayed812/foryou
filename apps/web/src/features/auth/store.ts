import { create } from "zustand";

/**
 * The access token lives in memory only — never localStorage — so it can't
 * be read by an XSS payload that isn't also intercepting network calls
 * directly. The refresh token is an HttpOnly cookie the browser handles for
 * us (architecture doc §05); on a hard page reload we silently POST
 * /auth/refresh once (see app/App.tsx) to rehydrate this store from it.
 */
interface AuthState {
  accessToken: string | null;
  status: "idle" | "authenticated" | "anonymous";
  setAccessToken: (token: string | null) => void;
  setStatus: (status: AuthState["status"]) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  status: "idle",
  setAccessToken: (token) =>
    set({ accessToken: token, status: token ? "authenticated" : "anonymous" }),
  setStatus: (status) => set({ status }),
  clear: () => set({ accessToken: null, status: "anonymous" }),
}));

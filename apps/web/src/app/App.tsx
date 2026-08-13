import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import axios from "axios";
import { queryClient } from "@/lib/query-client";
import { router } from "@/routes/router";
import { useAuthStore } from "@/features/auth/store";
import { API_URL } from "@/lib/api-url";
import "@/lib/i18n";

/**
 * On a hard reload there's no access token in memory (by design — it's
 * never persisted, see features/auth/store.ts), but the HttpOnly refresh
 * cookie may still be valid. One silent /auth/refresh attempt on boot
 * rehydrates the session without asking the user to log in again.
 */
function useBootstrapSession() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setStatus = useAuthStore((s) => s.setStatus);

  useEffect(() => {
    let cancelled = false;
    axios
      .post<{ accessToken: string }>(`${API_URL}/auth/refresh`, null, { withCredentials: true })
      .then((res) => {
        if (!cancelled) setAccessToken(res.data.accessToken);
      })
      .catch(() => {
        if (!cancelled) setStatus("anonymous");
      });
    return () => {
      cancelled = true;
    };
  }, [setAccessToken, setStatus]);
}

export function App() {
  useBootstrapSession();
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

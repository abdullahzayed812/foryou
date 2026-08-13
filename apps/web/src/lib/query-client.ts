import { QueryClient } from "@tanstack/react-query";
import { toApiError } from "./api-error";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const apiError = toApiError(error);
        // Don't retry client errors (4xx) — retrying a 401/404/422 just delays
        // the inevitable and burns the rate limit budget for nothing.
        if (apiError.status >= 400 && apiError.status < 500) return false;
        return failureCount < 2;
      },
      staleTime: 30_000,
    },
    mutations: {
      retry: false,
    },
  },
});

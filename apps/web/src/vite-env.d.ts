/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Optional — see apps/web/src/lib/api-url.ts for the dev-mode fallback.
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

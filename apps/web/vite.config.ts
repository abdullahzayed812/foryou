import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // A single .env at the repo root, shared with apps/api (see .env.example) —
  // only VITE_-prefixed keys are ever exposed to client code either way.
  //
  // Gotcha: Vite also special-cases a bare NODE_ENV key in that .env file —
  // if present, it overrides process.env.NODE_ENV for this build too, and
  // the root .env sets NODE_ENV=development for the API's benefit. Without
  // `npm run build`'s explicit `NODE_ENV=production` prefix, `vite build`
  // would silently run in dev mode: the dev JSX runtime (which embeds each
  // element's absolute source file path in the bundle) and no dead-code
  // elimination of `import.meta.env.DEV`-gated code. If this regresses,
  // `dist/assets/*.js` will contain the repo's absolute filesystem path.
  envDir: path.resolve(__dirname, "../.."),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
  },
});

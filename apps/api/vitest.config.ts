import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
    // Every test file shares one real dev Postgres/Redis — that's a
    // deliberate choice (README "Testing"), but it means truly global
    // mutable state (platform_settings, e.g. maintenanceMode) isn't safe
    // under file-level parallelism: one file's transient toggle can 503 an
    // unrelated file's concurrent request. Run files sequentially instead
    // of paying for isolation this suite doesn't otherwise need.
    fileParallelism: false,
  },
});

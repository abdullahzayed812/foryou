import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// vitest.config.ts sets `globals: false` (explicit imports everywhere, matching
// apps/api's style) — Testing Library's auto-cleanup only hooks into a
// *global* afterEach, so without this it silently never unmounts between
// tests and later tests see earlier tests' leftover DOM.
afterEach(() => {
  cleanup();
});

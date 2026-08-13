import { beforeAll } from "vitest";

// Ensure required env vars have safe test defaults even if .env.test isn't loaded
// by the runner. Real integration tests point DATABASE_URL/REDIS_URL at the
// docker-compose.dev.yml services via .env.test — see README "Testing".
beforeAll(() => {
  process.env.NODE_ENV ??= "test";
  process.env.JWT_ACCESS_SECRET ??= "test-access-secret-please-override";
  process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-please-override";
});

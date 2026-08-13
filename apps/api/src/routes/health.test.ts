import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

describe("health routes", () => {
  const app = createApp();

  it("GET /healthz returns 200 without touching the database", async () => {
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("GET /readyz reports database + redis connectivity", async () => {
    const res = await request(app).get("/readyz");
    expect([200, 503]).toContain(res.status);
    expect(res.body.checks).toHaveProperty("database");
    expect(res.body.checks).toHaveProperty("redis");
  });

  it("unknown routes return the stable error envelope", async () => {
    const res = await request(app).get("/api/v1/nope");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

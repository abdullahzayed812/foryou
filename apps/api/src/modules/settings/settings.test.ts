import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { createVerifiedUser, loginAs, uniqueEmail } from "../../test/helpers.js";

const { createApp } = await import("../../app.js");

describe("platform settings + maintenance mode", () => {
  const app = createApp();

  afterEach(async () => {
    // Global state (one row per key, shared across the whole test run) —
    // always leave maintenance mode off so it doesn't leak into other
    // test files' requests.
    const admin = await createVerifiedUser(uniqueEmail("settings-cleanup-admin"), "admin");
    const adminToken = await loginAs(app, admin.email);
    await request(app)
      .put("/api/v1/admin/settings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ maintenanceMode: false });
  });

  it("public settings only exposes the keys marked public", async () => {
    const res = await request(app).get("/api/v1/settings");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("maintenanceMode");
    expect(res.body).toHaveProperty("platformAnnouncement");
    expect(res.body).toHaveProperty("supportEmail");
    expect(res.body).not.toHaveProperty("minWithdrawalAmount");
  });

  it("only an admin can read or write /admin/settings", async () => {
    const customer = await createVerifiedUser(uniqueEmail("settings-non-admin"));
    const customerToken = await loginAs(app, customer.email);

    const getRes = await request(app)
      .get("/api/v1/admin/settings")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(getRes.status).toBe(403);

    const putRes = await request(app)
      .put("/api/v1/admin/settings")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ maintenanceMode: true });
    expect(putRes.status).toBe(403);
  });

  it("maintenance mode blocks mutating requests but allows GETs, /auth, /admin, and /webhooks", async () => {
    const admin = await createVerifiedUser(uniqueEmail("maintenance-admin"), "admin");
    const adminToken = await loginAs(app, admin.email);
    const customer = await createVerifiedUser(uniqueEmail("maintenance-customer"));
    const customerToken = await loginAs(app, customer.email);

    const enableRes = await request(app)
      .put("/api/v1/admin/settings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ maintenanceMode: true });
    expect(enableRes.status).toBe(200);
    expect(enableRes.body.maintenanceMode).toBe(true);

    const blockedRes = await request(app)
      .post("/api/v1/import-requests")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ links: ["https://shein.com/cart/maintenance-blocked"] });
    expect(blockedRes.status).toBe(503);
    expect(blockedRes.body.error.code).toBe("MAINTENANCE_MODE");

    const getStillWorksRes = await request(app).get("/api/v1/news");
    expect(getStillWorksRes.status).toBe(200);

    const loginStillWorksRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: customer.email, password: "Password123" });
    expect(loginStillWorksRes.status).toBe(200);

    const adminStillWorksRes = await request(app)
      .put("/api/v1/admin/settings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ platformAnnouncement: "still editable during maintenance" });
    expect(adminStillWorksRes.status).toBe(200);
  });
});

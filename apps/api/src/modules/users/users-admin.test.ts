import { describe, it, expect } from "vitest";
import request from "supertest";
import { createVerifiedUser, loginAs, uniqueEmail } from "../../test/helpers.js";

const { createApp } = await import("../../app.js");

describe("admin user management", () => {
  const app = createApp();

  it("lists users filtered by role, and returns per-role/status stats", async () => {
    const admin = await createVerifiedUser(uniqueEmail("admin-users-list"), "admin");
    const adminToken = await loginAs(app, admin.email);
    const seller = await createVerifiedUser(uniqueEmail("admin-users-seller"), "seller");

    const listRes = await request(app)
      .get("/api/v1/admin/users")
      .query({ role: "seller" })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.some((u: { id: string }) => u.id === seller.id)).toBe(true);
    // Security regression guard: this list must never leak password hashes.
    for (const user of listRes.body) {
      expect(user).not.toHaveProperty("passwordHash");
    }

    const statsRes = await request(app)
      .get("/api/v1/admin/users/stats")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.byRole.some((r: { role: string }) => r.role === "seller")).toBe(true);
  });

  it("admin can view a user's detail page", async () => {
    const admin = await createVerifiedUser(uniqueEmail("admin-users-detail"), "admin");
    const adminToken = await loginAs(app, admin.email);
    const customer = await createVerifiedUser(uniqueEmail("admin-users-detail-customer"));

    const res = await request(app)
      .get(`/api/v1/admin/users/${customer.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(customer.id);
    expect(res.body.customerProfile).not.toBeNull();
  });

  it("suspend blocks login; reactivate restores it; double-suspend is rejected", async () => {
    const admin = await createVerifiedUser(uniqueEmail("admin-users-suspend"), "admin");
    const adminToken = await loginAs(app, admin.email);
    const customer = await createVerifiedUser(uniqueEmail("admin-users-suspend-customer"));

    const suspendRes = await request(app)
      .post(`/api/v1/admin/users/${customer.id}/suspend`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "policy violation" });
    expect(suspendRes.status).toBe(204);

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: customer.email, password: "Password123" });
    expect(loginRes.status).toBe(403);
    expect(loginRes.body.error.code).toBe("ACCOUNT_SUSPENDED");

    const doubleSuspendRes = await request(app)
      .post(`/api/v1/admin/users/${customer.id}/suspend`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});
    expect(doubleSuspendRes.status).toBe(409);

    const reactivateRes = await request(app)
      .post(`/api/v1/admin/users/${customer.id}/reactivate`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(reactivateRes.status).toBe(204);

    const loginAgainRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: customer.email, password: "Password123" });
    expect(loginAgainRes.status).toBe(200);

    await new Promise((r) => setTimeout(r, 150));
    const notifRes = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${loginAgainRes.body.accessToken}`);
    const types = notifRes.body.map((n: { type: string }) => n.type);
    expect(types).toContain("account_suspended");
    expect(types).toContain("account_reactivated");
  });

  it("requireActiveAccount blocks a suspended seller from submitting an offer", async () => {
    const admin = await createVerifiedUser(uniqueEmail("admin-users-offer-admin"), "admin");
    const adminToken = await loginAs(app, admin.email);
    const customer = await createVerifiedUser(uniqueEmail("admin-users-offer-customer"));
    const seller = await createVerifiedUser(uniqueEmail("admin-users-offer-seller"), "seller");
    const customerToken = await loginAs(app, customer.email);
    const sellerToken = await loginAs(app, seller.email);

    const irRes = await request(app)
      .post("/api/v1/import-requests")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ links: ["https://shein.com/cart/active-account-test"] });

    await request(app)
      .post(`/api/v1/admin/users/${seller.id}/suspend`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    const blockedRes = await request(app)
      .post(`/api/v1/import-requests/${irRes.body.id}/offers`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ totalPrice: 100, estimatedDeliveryDays: 5, depositPercentage: 20 });
    expect(blockedRes.status).toBe(403);
    expect(blockedRes.body.error.code).toBe("ACCOUNT_SUSPENDED");

    await request(app)
      .post(`/api/v1/admin/users/${seller.id}/reactivate`)
      .set("Authorization", `Bearer ${adminToken}`);

    const okRes = await request(app)
      .post(`/api/v1/import-requests/${irRes.body.id}/offers`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ totalPrice: 100, estimatedDeliveryDays: 5, depositPercentage: 20 });
    expect(okRes.status).toBe(201);
  });
});

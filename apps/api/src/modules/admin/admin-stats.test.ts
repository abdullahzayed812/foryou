import { describe, it, expect } from "vitest";
import request from "supertest";
import { createVerifiedUser, loginAs, uniqueEmail } from "../../test/helpers.js";

const { createApp } = await import("../../app.js");

describe("admin platform stats", () => {
  const app = createApp();

  it("aggregates counts across users/orders/disputes/wallet/reviews, admin-only", async () => {
    const admin = await createVerifiedUser(uniqueEmail("stats-admin"), "admin");
    const adminToken = await loginAs(app, admin.email);
    const customer = await createVerifiedUser(uniqueEmail("stats-customer"));
    const customerToken = await loginAs(app, customer.email);

    const res = await request(app)
      .get("/api/v1/admin/stats")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("users.byRole");
    expect(res.body).toHaveProperty("users.byStatus");
    expect(res.body).toHaveProperty("orders.byStage");
    expect(res.body).toHaveProperty("orders.completedGMV");
    expect(res.body).toHaveProperty("disputes.byStatus");
    expect(res.body).toHaveProperty("disputes.counterfeitConfirmedCount");
    expect(res.body).toHaveProperty("wallet.platformBalances");
    expect(res.body).toHaveProperty("wallet.pendingWithdrawals");
    expect(res.body).toHaveProperty("reviews.average");
    expect(typeof res.body.orders.completedGMV).toBe("number");

    const forbiddenRes = await request(app)
      .get("/api/v1/admin/stats")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(forbiddenRes.status).toBe(403);
  });
});

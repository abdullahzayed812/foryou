import { describe, it, expect } from "vitest";
import request from "supertest";
import { createVerifiedUser, loginAs, uniqueEmail } from "../../test/helpers.js";

const { createApp } = await import("../../app.js");
const { walletRepository } = await import("./repository.js");

describe("admin commission rates + platform settings wiring", () => {
  const app = createApp();

  it("admin can view and set commission rates; the new rate is versioned, not overwritten in place", async () => {
    const admin = await createVerifiedUser(uniqueEmail("commission-admin"), "admin");
    const adminToken = await loginAs(app, admin.email);

    const beforeRes = await request(app)
      .get("/api/v1/admin/commission-rates")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(beforeRes.status).toBe(200);
    expect(beforeRes.body).toHaveLength(2);

    // A unique-ish value so this assertion can't coincidentally match
    // whatever a previous run of this same test (shared dev DB, no reset
    // between runs) already left behind.
    const newPercentage = Math.round((3 + Math.random()) * 100) / 100;
    const beforeInsert = new Date();

    const setRes = await request(app)
      .post("/api/v1/admin/commission-rates")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "seller", percentage: newPercentage });
    expect(setRes.status).toBe(201);
    expect(Number(setRes.body.percentage)).toBe(newPercentage);

    const afterRes = await request(app)
      .get("/api/v1/admin/commission-rates")
      .set("Authorization", `Bearer ${adminToken}`);
    const sellerRate = afterRes.body.find((r: { role: string }) => r.role === "seller");
    expect(Number(sellerRate.percentage)).toBe(newPercentage);

    // The rate in effect a moment before this test's insert must NOT be the
    // rate this test just set — proves the change was versioned (a new row
    // effective-from now) rather than an in-place overwrite of history.
    const historicalRate = await walletRepository.currentCommissionRate("seller", beforeInsert);
    expect(historicalRate).not.toBe(newPercentage);
  });

  it("non-admin can't set commission rates", async () => {
    const seller = await createVerifiedUser(uniqueEmail("commission-non-admin"), "seller");
    const sellerToken = await loginAs(app, seller.email);

    const res = await request(app)
      .post("/api/v1/admin/commission-rates")
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ role: "seller", percentage: 10 });
    expect(res.status).toBe(403);
  });

  it("withdrawal below the configured minimum is rejected", async () => {
    const admin = await createVerifiedUser(uniqueEmail("min-withdrawal-admin"), "admin");
    const adminToken = await loginAs(app, admin.email);
    const seller = await createVerifiedUser(uniqueEmail("min-withdrawal-seller"), "seller");
    const sellerToken = await loginAs(app, seller.email);

    await request(app)
      .put("/api/v1/admin/settings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ minWithdrawalAmount: 200 });

    const res = await request(app)
      .post("/api/v1/wallet/withdrawals")
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ amount: 50 });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toContain("200");

    await request(app)
      .put("/api/v1/admin/settings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ minWithdrawalAmount: 50 });
  });
});

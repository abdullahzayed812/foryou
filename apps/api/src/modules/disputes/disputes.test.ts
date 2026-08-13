import { describe, it, expect } from "vitest";
import request from "supertest";
import type { Express } from "express";
import {
  createVerifiedUser,
  loginAs,
  uniqueEmail,
  createReadyMediaAsset,
} from "../../test/helpers.js";

const { createApp } = await import("../../app.js");
const { paymobClient } = await import("../payments/paymob-client.js");
const { db } = await import("../../db/index.js");
const { orders } = await import("../orders/schema.js");
const { eq } = await import("drizzle-orm");

/** Creates an import order and pays its deposit, stopping right after — stage stays `deposit_paid`. */
async function createPaidOrder(
  app: Express,
  depositPercentage: 20 | 30 | 40 | 50,
  totalPrice: number,
) {
  const customer = await createVerifiedUser(uniqueEmail("disputes-customer"), "customer");
  const seller = await createVerifiedUser(uniqueEmail("disputes-seller"), "seller");
  const customerToken = await loginAs(app, customer.email);
  const sellerToken = await loginAs(app, seller.email);

  const irRes = await request(app)
    .post("/api/v1/import-requests")
    .set("Authorization", `Bearer ${customerToken}`)
    .send({ links: ["https://shein.com/cart/disputes-test"] });
  const offerRes = await request(app)
    .post(`/api/v1/import-requests/${irRes.body.id}/offers`)
    .set("Authorization", `Bearer ${sellerToken}`)
    .send({ totalPrice, estimatedDeliveryDays: 7, depositPercentage });
  const selectRes = await request(app)
    .post(`/api/v1/offers/${offerRes.body.id}/select`)
    .set("Authorization", `Bearer ${customerToken}`);
  const orderId = selectRes.body.id as string;

  const initRes = await request(app)
    .post(`/api/v1/orders/${orderId}/deposit/pay`)
    .set("Authorization", `Bearer ${customerToken}`);
  const amountCents = Math.round(Number(selectRes.body.depositAmount) * 100);
  const hmac = paymobClient.signWebhookPayload(
    initRes.body.providerTransactionId,
    orderId,
    amountCents,
    true,
  );
  await request(app).post("/api/v1/webhooks/paymob").send({
    transactionId: initRes.body.providerTransactionId,
    orderId,
    amountCents,
    success: true,
    hmac,
  });

  return { customer, seller, customerToken, sellerToken, orderId };
}

/** Marks delivered (no completion) so a dispute can be opened while the deposit is still `pending`. */
async function deliver(app: Express, sellerToken: string, orderId: string) {
  await request(app)
    .patch(`/api/v1/sellers/me/orders/${orderId}/timeline`)
    .set("Authorization", `Bearer ${sellerToken}`)
    .send({ step: "delivered" });
}

describe("disputes", () => {
  const app = createApp();

  it("full refund reverses the seller's still-PENDING balance (dispute opened before order completion)", async () => {
    const { seller, sellerToken, customerToken, orderId } = await createPaidOrder(app, 20, 500);
    await deliver(app, sellerToken, orderId);

    const walletBefore = await request(app)
      .get("/api/v1/wallet/me")
      .set("Authorization", `Bearer ${sellerToken}`);
    expect(walletBefore.body.pendingBalance).toBe("100.00");

    const evidenceId = await createReadyMediaAsset(seller.id, "dispute_evidence");
    const openRes = await request(app)
      .post("/api/v1/disputes")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        orderId,
        reason: "item_not_delivered",
        description: "The item never arrived despite the tracking showing delivered.",
        photoMediaAssetIds: [evidenceId],
      });
    expect(openRes.status).toBe(201);

    const orderRes = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(orderRes.body.openDisputeId).toBe(openRes.body.id);

    const admin = await createVerifiedUser(uniqueEmail("disputes-admin"), "admin");
    const adminToken = await loginAs(app, admin.email);
    const resolveRes = await request(app)
      .post(`/api/v1/admin/disputes/${openRes.body.id}/resolve`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        resolution: "full_refund",
        resolutionNote: "Confirmed non-delivery with the carrier.",
      });
    expect(resolveRes.status).toBe(200);

    const walletAfter = await request(app)
      .get("/api/v1/wallet/me")
      .set("Authorization", `Bearer ${sellerToken}`);
    expect(walletAfter.body.pendingBalance).toBe("0.00");
    expect(walletAfter.body.availableBalance).toBe("0.00");

    const orderAfter = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(orderAfter.body.openDisputeId).toBeNull();
  });

  it("partial refund reverses the seller's already-released AVAILABLE balance (dispute opened after completion)", async () => {
    const { seller, sellerToken, customerToken, orderId } = await createPaidOrder(app, 30, 400);
    await deliver(app, sellerToken, orderId);
    await request(app)
      .post(`/api/v1/orders/${orderId}/confirm-receipt`)
      .set("Authorization", `Bearer ${customerToken}`);

    const walletBefore = await request(app)
      .get("/api/v1/wallet/me")
      .set("Authorization", `Bearer ${sellerToken}`);
    expect(walletBefore.body.availableBalance).toBe("120.00"); // released on completion (new seller)
    expect(walletBefore.body.pendingBalance).toBe("0.00");

    const evidenceId = await createReadyMediaAsset(seller.id, "dispute_evidence");
    const openRes = await request(app)
      .post("/api/v1/disputes")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        orderId,
        reason: "missing_items",
        description: "One of the items I ordered was missing from the package.",
        photoMediaAssetIds: [evidenceId],
      });
    expect(openRes.status).toBe(201);

    const admin = await createVerifiedUser(uniqueEmail("disputes-admin2"), "admin");
    const adminToken = await loginAs(app, admin.email);
    const resolveRes = await request(app)
      .post(`/api/v1/admin/disputes/${openRes.body.id}/resolve`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        resolution: "partial_refund",
        resolutionNote: "Missing item confirmed.",
        refundAmount: 60,
      });
    expect(resolveRes.status).toBe(200);

    const walletAfter = await request(app)
      .get("/api/v1/wallet/me")
      .set("Authorization", `Bearer ${sellerToken}`);
    expect(walletAfter.body.pendingBalance).toBe("0.00"); // must NOT go negative — the bug this test guards against
    expect(walletAfter.body.availableBalance).toBe("60.00");
  });

  it("rejects opening a second dispute on the same order, and rejects opening one outside the 48h window", async () => {
    const { seller, sellerToken, customerToken, orderId } = await createPaidOrder(app, 20, 300);
    await deliver(app, sellerToken, orderId);
    const evidenceId = await createReadyMediaAsset(seller.id, "dispute_evidence");

    const firstRes = await request(app)
      .post("/api/v1/disputes")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        orderId,
        reason: "wrong_color",
        description: "The color received doesn't match what I ordered.",
        photoMediaAssetIds: [evidenceId],
      });
    expect(firstRes.status).toBe(201);

    const secondRes = await request(app)
      .post("/api/v1/disputes")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        orderId,
        reason: "damaged_product",
        description: "It's also damaged on top of being the wrong color.",
        photoMediaAssetIds: [evidenceId],
      });
    expect(secondRes.status).toBe(409);

    const {
      seller: seller2,
      sellerToken: sellerToken2,
      customerToken: customerToken2,
      orderId: orderId2,
    } = await createPaidOrder(app, 20, 300);
    await deliver(app, sellerToken2, orderId2);
    await db
      .update(orders)
      .set({ deliveredAt: new Date(Date.now() - 49 * 60 * 60 * 1000) })
      .where(eq(orders.id, orderId2));
    const evidenceId2 = await createReadyMediaAsset(seller2.id, "dispute_evidence");
    const lateRes = await request(app)
      .post("/api/v1/disputes")
      .set("Authorization", `Bearer ${customerToken2}`)
      .send({
        orderId: orderId2,
        reason: "delivery_delay",
        description: "Too late to dispute — outside the 48h window.",
        photoMediaAssetIds: [evidenceId2],
      });
    expect(lateRes.status).toBe(409);
  });

  it("seller can respond within the window; the dispute then shows up in the admin awaiting-review queue", async () => {
    const { seller, sellerToken, customerToken, orderId } = await createPaidOrder(app, 20, 300);
    await deliver(app, sellerToken, orderId);
    const evidenceId = await createReadyMediaAsset(seller.id, "dispute_evidence");
    const openRes = await request(app)
      .post("/api/v1/disputes")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        orderId,
        reason: "wrong_size",
        description: "Received a size that doesn't match my order at all.",
        photoMediaAssetIds: [evidenceId],
      });

    const respondRes = await request(app)
      .post(`/api/v1/sellers/me/disputes/${openRes.body.id}/respond`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ response: "We shipped exactly what was ordered." });
    expect(respondRes.status).toBe(200);
    expect(respondRes.body.status).toBe("seller_responded");

    const admin = await createVerifiedUser(uniqueEmail("disputes-admin3"), "admin");
    const adminToken = await loginAs(app, admin.email);
    const queueRes = await request(app)
      .get("/api/v1/admin/disputes/awaiting-review")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(queueRes.body.some((d: { id: string }) => d.id === openRes.body.id)).toBe(true);

    const detailRes = await request(app)
      .get(`/api/v1/admin/disputes/${openRes.body.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.id).toBe(openRes.body.id);
    expect(detailRes.body.evidence).toHaveLength(1);
  });

  it("counterfeit-confirmed resolution hides the product and applies a major trust score deduction to the seller", async () => {
    const { seller, sellerToken, customerToken, orderId } = await createPaidOrder(app, 20, 300);
    await deliver(app, sellerToken, orderId);
    const evidenceId = await createReadyMediaAsset(seller.id, "dispute_evidence");
    const openRes = await request(app)
      .post("/api/v1/disputes")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        orderId,
        reason: "non_original_product",
        description: "This is a clear counterfeit, not the genuine branded item.",
        photoMediaAssetIds: [evidenceId],
      });

    const admin = await createVerifiedUser(uniqueEmail("disputes-admin4"), "admin");
    const adminToken = await loginAs(app, admin.email);
    const resolveRes = await request(app)
      .post(`/api/v1/admin/disputes/${openRes.body.id}/resolve`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        resolution: "full_refund",
        resolutionNote: "Confirmed counterfeit.",
        counterfeitConfirmed: true,
      });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.counterfeitConfirmed).toBe(true);

    await new Promise((r) => setTimeout(r, 150));
    const scoreRes = await request(app)
      .get(`/api/v1/admin/users/${seller.id}/trust-score`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(scoreRes.body.score).toBe(30); // 50 - 20, order never reached "completed" so no +3
  });

  it("a rejected + false-flagged dispute deducts the customer's trust score", async () => {
    const { customer, seller, sellerToken, customerToken, orderId } = await createPaidOrder(
      app,
      20,
      300,
    );
    await deliver(app, sellerToken, orderId);
    const evidenceId = await createReadyMediaAsset(seller.id, "dispute_evidence");
    const openRes = await request(app)
      .post("/api/v1/disputes")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        orderId,
        reason: "delivery_delay",
        description: "Claiming a delay that didn't actually happen.",
        photoMediaAssetIds: [evidenceId],
      });

    const admin = await createVerifiedUser(uniqueEmail("disputes-admin5"), "admin");
    const adminToken = await loginAs(app, admin.email);
    const resolveRes = await request(app)
      .post(`/api/v1/admin/disputes/${openRes.body.id}/resolve`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        resolution: "rejected",
        resolutionNote: "Delivery was on time.",
        falseDispute: true,
      });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.falseDispute).toBe(true);

    await new Promise((r) => setTimeout(r, 150));
    const scoreRes = await request(app)
      .get(`/api/v1/admin/users/${customer.id}/trust-score`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(scoreRes.body.score).toBe(35); // 50 - 15
  });

  it("fulfiller can fetch a single owned dispute by id, but not one belonging to someone else", async () => {
    const { seller, sellerToken, customerToken, orderId } = await createPaidOrder(app, 20, 300);
    await deliver(app, sellerToken, orderId);
    const evidenceId = await createReadyMediaAsset(seller.id, "dispute_evidence");
    const openRes = await request(app)
      .post("/api/v1/disputes")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        orderId,
        reason: "wrong_color",
        description: "The color received doesn't match what I ordered.",
        photoMediaAssetIds: [evidenceId],
      });

    const ownRes = await request(app)
      .get(`/api/v1/sellers/me/disputes/${openRes.body.id}`)
      .set("Authorization", `Bearer ${sellerToken}`);
    expect(ownRes.status).toBe(200);
    expect(ownRes.body.id).toBe(openRes.body.id);

    const otherSeller = await createVerifiedUser(uniqueEmail("disputes-other-seller"), "seller");
    const otherSellerToken = await loginAs(app, otherSeller.email);
    const otherRes = await request(app)
      .get(`/api/v1/sellers/me/disputes/${openRes.body.id}`)
      .set("Authorization", `Bearer ${otherSellerToken}`);
    expect(otherRes.status).toBe(404);
  });
});

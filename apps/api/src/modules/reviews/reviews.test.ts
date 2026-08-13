import { describe, it, expect } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createVerifiedUser, loginAs, uniqueEmail } from "../../test/helpers.js";

const { createApp } = await import("../../app.js");
const { paymobClient } = await import("../payments/paymob-client.js");

/** Drives an order all the way to `completed` through the real HTTP pipeline. */
async function createCompletedOrder(
  app: Express,
  depositPercentage: 20 | 30 | 40 | 50,
  totalPrice: number,
) {
  const customer = await createVerifiedUser(uniqueEmail("reviews-customer"), "customer");
  const seller = await createVerifiedUser(uniqueEmail("reviews-seller"), "seller");
  const customerToken = await loginAs(app, customer.email);
  const sellerToken = await loginAs(app, seller.email);

  const irRes = await request(app)
    .post("/api/v1/import-requests")
    .set("Authorization", `Bearer ${customerToken}`)
    .send({ links: ["https://shein.com/cart/reviews-test"] });
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

  await request(app)
    .patch(`/api/v1/sellers/me/orders/${orderId}/timeline`)
    .set("Authorization", `Bearer ${sellerToken}`)
    .send({ step: "delivered" });
  await request(app)
    .post(`/api/v1/orders/${orderId}/confirm-receipt`)
    .set("Authorization", `Bearer ${customerToken}`);

  return { customer, seller, customerToken, sellerToken, orderId };
}

describe("reviews", () => {
  const app = createApp();

  it("customer reviews a completed order; a second review on the same order is rejected", async () => {
    const { customerToken, orderId } = await createCompletedOrder(app, 20, 500);

    const createRes = await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ orderId, rating: 5, comment: "Excellent!" });
    expect(createRes.status).toBe(201);
    expect(createRes.body.rating).toBe(5);

    const dupRes = await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ orderId, rating: 3 });
    expect(dupRes.status).toBe(409);
  });

  it("reviewing before completion is rejected", async () => {
    const customer = await createVerifiedUser(uniqueEmail("reviews-early-customer"), "customer");
    const seller = await createVerifiedUser(uniqueEmail("reviews-early-seller"), "seller");
    const customerToken = await loginAs(app, customer.email);
    const sellerToken = await loginAs(app, seller.email);

    const irRes = await request(app)
      .post("/api/v1/import-requests")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ links: ["https://shein.com/cart/reviews-early"] });
    const offerRes = await request(app)
      .post(`/api/v1/import-requests/${irRes.body.id}/offers`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ totalPrice: 300, estimatedDeliveryDays: 5, depositPercentage: 20 });
    const selectRes = await request(app)
      .post(`/api/v1/offers/${offerRes.body.id}/select`)
      .set("Authorization", `Bearer ${customerToken}`);

    const reviewRes = await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ orderId: selectRes.body.id, rating: 5 });
    expect(reviewRes.status).toBe(409);
  });

  it("seller can reply once; a second reply is rejected; stats aggregate correctly", async () => {
    const { sellerToken, customerToken, orderId } = await createCompletedOrder(app, 30, 400);
    const review = await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ orderId, rating: 4, comment: "Good" });

    const replyRes = await request(app)
      .post(`/api/v1/sellers/me/reviews/${review.body.id}/reply`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ reply: "Thanks for the order!" });
    expect(replyRes.status).toBe(201);

    const dupReplyRes = await request(app)
      .post(`/api/v1/sellers/me/reviews/${review.body.id}/reply`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ reply: "again" });
    expect(dupReplyRes.status).toBe(409);

    const statsRes = await request(app).get(`/api/v1/reviews/of/${review.body.revieweeId}`);
    expect(statsRes.body.stats.count).toBe(1);
    expect(Number(statsRes.body.stats.average)).toBe(4);
    expect(statsRes.body.items[0].reply.reply).toBe("Thanks for the order!");
  });

  it("a high rating raises the reviewee's trust score; a low rating lowers it", async () => {
    const {
      customerToken: highCustomerToken,
      orderId: highOrderId,
      seller: highSeller,
    } = await createCompletedOrder(app, 20, 300);
    await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${highCustomerToken}`)
      .send({ orderId: highOrderId, rating: 5 });

    const {
      customerToken: lowCustomerToken,
      orderId: lowOrderId,
      seller: lowSeller,
    } = await createCompletedOrder(app, 20, 300);
    await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${lowCustomerToken}`)
      .send({ orderId: lowOrderId, rating: 1 });

    await new Promise((r) => setTimeout(r, 150));
    const admin = await createVerifiedUser(uniqueEmail("reviews-trust-admin"), "admin");
    const adminToken = await loginAs(app, admin.email);

    const highScoreRes = await request(app)
      .get(`/api/v1/admin/users/${highSeller.id}/trust-score`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(highScoreRes.body.score).toBe(54); // 50 + 3 (order.completed) + 1 (5-star review)

    const lowScoreRes = await request(app)
      .get(`/api/v1/admin/users/${lowSeller.id}/trust-score`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(lowScoreRes.body.score).toBe(51); // 50 + 3 (order.completed) - 2 (1-star review)
  });

  it("an edited review updates rating and comment within the edit window", async () => {
    const { customerToken, orderId } = await createCompletedOrder(app, 20, 250);
    const review = await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ orderId, rating: 2, comment: "Meh" });

    const editRes = await request(app)
      .patch(`/api/v1/reviews/${review.body.id}`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ rating: 5, comment: "Actually great after all" });
    expect(editRes.status).toBe(200);
    expect(editRes.body.rating).toBe(5);
    expect(editRes.body.comment).toBe("Actually great after all");
  });

  it("the pending-review reminder lists a completed, unreviewed order and drops it once reviewed", async () => {
    const { customerToken, orderId } = await createCompletedOrder(app, 20, 250);

    const beforeRes = await request(app)
      .get("/api/v1/reviews/pending")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(beforeRes.body.some((p: { orderId: string }) => p.orderId === orderId)).toBe(true);

    await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ orderId, rating: 4 });

    const afterRes = await request(app)
      .get("/api/v1/reviews/pending")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(afterRes.body.some((p: { orderId: string }) => p.orderId === orderId)).toBe(false);
  });
});

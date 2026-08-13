import { describe, it, expect } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createVerifiedUser, loginAs, uniqueEmail } from "../../test/helpers.js";

const { createApp } = await import("../../app.js");
const { paymobClient } = await import("../payments/paymob-client.js");
const { ordersRepository } = await import("./repository.js");
const { ordersService } = await import("./service.js");
const { categoriesRepository } = await import("../categories/repository.js");
const { brandsRepository } = await import("../brands/repository.js");
const { mediaRepository } = await import("../media/repository.js");
const { verificationRepository } = await import("../verification/repository.js");
const { db } = await import("../../db/index.js");
const { orders } = await import("./schema.js");
const { eq } = await import("drizzle-orm");

async function createSellerAndOrder(
  app: Express,
  depositPercentage: 20 | 30 | 40 | 50,
  totalPrice: number,
) {
  const customer = await createVerifiedUser(uniqueEmail("orders-customer"), "customer");
  const seller = await createVerifiedUser(uniqueEmail("orders-seller"), "seller");
  const customerToken = await loginAs(app, customer.email);
  const sellerToken = await loginAs(app, seller.email);

  const irRes = await request(app)
    .post("/api/v1/import-requests")
    .set("Authorization", `Bearer ${customerToken}`)
    .send({ links: ["https://shein.com/cart/orders-test"] });
  const offerRes = await request(app)
    .post(`/api/v1/import-requests/${irRes.body.id}/offers`)
    .set("Authorization", `Bearer ${sellerToken}`)
    .send({ totalPrice, estimatedDeliveryDays: 7, depositPercentage });
  const selectRes = await request(app)
    .post(`/api/v1/offers/${offerRes.body.id}/select`)
    .set("Authorization", `Bearer ${customerToken}`);

  return { customer, seller, customerToken, sellerToken, order: selectRes.body };
}

/** Pays an order's deposit through the real webhook pipeline (mock mode), not a DB shortcut. */
async function payDepositAs(app: Express, token: string, orderId: string) {
  const initRes = await request(app)
    .post(`/api/v1/orders/${orderId}/deposit/pay`)
    .set("Authorization", `Bearer ${token}`);
  expect(initRes.status).toBe(201);

  const amountCents = Math.round(
    Number((await ordersRepository.findById(orderId))!.depositAmount ?? 0) * 100,
  );
  const hmac = paymobClient.signWebhookPayload(
    initRes.body.providerTransactionId,
    orderId,
    amountCents,
    true,
  );
  const webhookRes = await request(app).post("/api/v1/webhooks/paymob").send({
    transactionId: initRes.body.providerTransactionId,
    orderId,
    amountCents,
    success: true,
    hmac,
  });
  expect(webhookRes.status).toBe(200);
  return initRes.body;
}

describe("orders + payments + wallet", () => {
  const app = createApp();

  it("deposit payment: webhook is the only thing that can mark an order paid, and rejects a bad signature", async () => {
    const { sellerToken, customerToken, order } = await createSellerAndOrder(app, 30, 1000);

    const initRes = await request(app)
      .post(`/api/v1/orders/${order.id}/deposit/pay`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(initRes.status).toBe(201);

    const badWebhook = await request(app).post("/api/v1/webhooks/paymob").send({
      transactionId: initRes.body.providerTransactionId,
      orderId: order.id,
      amountCents: 30000,
      success: true,
      hmac: "not-the-real-signature",
    });
    expect(badWebhook.status).toBe(422);

    const orderStillWaiting = await request(app)
      .get(`/api/v1/orders/${order.id}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(orderStillWaiting.body.stage).toBe("awaiting_deposit");

    await payDepositAs(app, customerToken, order.id);

    const orderPaid = await request(app)
      .get(`/api/v1/orders/${order.id}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(orderPaid.body.stage).toBe("deposit_paid");

    const walletRes = await request(app)
      .get("/api/v1/wallet/me")
      .set("Authorization", `Bearer ${sellerToken}`);
    expect(walletRes.body.pendingBalance).toBe("300.00"); // brand-new seller account -> commission-free month 1
  });

  it("a webhook for the same transaction twice is a no-op (idempotent)", async () => {
    const { customerToken, sellerToken, order } = await createSellerAndOrder(app, 20, 500);
    const initRes = await request(app)
      .post(`/api/v1/orders/${order.id}/deposit/pay`)
      .set("Authorization", `Bearer ${customerToken}`);

    const amountCents = 10000;
    const hmac = paymobClient.signWebhookPayload(
      initRes.body.providerTransactionId,
      order.id,
      amountCents,
      true,
    );
    const payload = {
      transactionId: initRes.body.providerTransactionId,
      orderId: order.id,
      amountCents,
      success: true,
      hmac,
    };

    await request(app).post("/api/v1/webhooks/paymob").send(payload);
    await request(app).post("/api/v1/webhooks/paymob").send(payload); // replay

    const walletRes = await request(app)
      .get("/api/v1/wallet/me")
      .set("Authorization", `Bearer ${sellerToken}`);
    expect(walletRes.body.pendingBalance).toBe("100.00"); // not double-credited
  });

  it("full lifecycle: timeline -> delivery -> confirm -> new-seller on-completion release + trust score", async () => {
    const { customer, seller, customerToken, sellerToken, order } = await createSellerAndOrder(
      app,
      20,
      500,
    );
    await payDepositAs(app, customerToken, order.id);

    for (const step of ["shipment_in_progress", "out_for_delivery", "delivered"]) {
      const res = await request(app)
        .patch(`/api/v1/sellers/me/orders/${order.id}/timeline`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({ step });
      expect(res.status).toBe(200);
    }

    const confirmRes = await request(app)
      .post(`/api/v1/orders/${order.id}/confirm-receipt`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.stage).toBe("completed");

    const walletRes = await request(app)
      .get("/api/v1/wallet/me")
      .set("Authorization", `Bearer ${sellerToken}`);
    expect(walletRes.body.availableBalance).toBe("100.00"); // 500 * 20%, released on completion (new seller, <3 orders)
    expect(walletRes.body.pendingBalance).toBe("0.00");

    // Trust Score updates via a fire-and-forget in-process subscriber (architecture doc §06) —
    // give it a moment before reading it back through the admin-only numeric endpoint.
    await new Promise((r) => setTimeout(r, 100));
    const admin = await createVerifiedUser(uniqueEmail("orders-lifecycle-admin"), "admin");
    const adminToken = await loginAs(app, admin.email);

    const sellerScoreRes = await request(app)
      .get(`/api/v1/admin/users/${seller.id}/trust-score`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(sellerScoreRes.body.score).toBe(53); // 50 + 3

    const customerScoreRes = await request(app)
      .get(`/api/v1/admin/users/${customer.id}/trust-score`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(customerScoreRes.body.score).toBe(52); // 50 + 2
  });

  it("seller cancellation after deposit: full reversal to the wallet and blocks the timeline route", async () => {
    const { sellerToken, customerToken, order } = await createSellerAndOrder(app, 30, 400);
    await payDepositAs(app, customerToken, order.id);

    const walletBefore = await request(app)
      .get("/api/v1/wallet/me")
      .set("Authorization", `Bearer ${sellerToken}`);
    expect(walletBefore.body.pendingBalance).toBe("120.00");

    const cancelRes = await request(app)
      .post(`/api/v1/sellers/me/orders/${order.id}/cancel`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ reason: "Item no longer available" });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.stage).toBe("cancelled");

    const walletAfter = await request(app)
      .get("/api/v1/wallet/me")
      .set("Authorization", `Bearer ${sellerToken}`);
    expect(walletAfter.body.pendingBalance).toBe("0.00");

    const timelineAfterCancel = await request(app)
      .patch(`/api/v1/sellers/me/orders/${order.id}/timeline`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ step: "shipment_in_progress" });
    expect(timelineAfterCancel.status).toBe(409);
  });

  it("customer can cancel freely before the deposit is paid, but not after", async () => {
    const { customerToken, order } = await createSellerAndOrder(app, 20, 300);

    const cancelBeforeRes = await request(app)
      .post(`/api/v1/orders/${order.id}/cancel`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(cancelBeforeRes.status).toBe(200);
    expect(cancelBeforeRes.body.stage).toBe("cancelled");

    const { customerToken: token2, order: order2 } = await createSellerAndOrder(app, 20, 300);
    await payDepositAs(app, token2, order2.id);
    const cancelAfterRes = await request(app)
      .post(`/api/v1/orders/${order2.id}/cancel`)
      .set("Authorization", `Bearer ${token2}`);
    expect(cancelAfterRes.status).toBe(409);
  });

  it("deposit deadline: 1st miss reopens the request (same seller can resubmit), 2nd miss closes it permanently", async () => {
    const { sellerToken, customerToken, order } = await createSellerAndOrder(app, 20, 200);

    await db
      .update(orders)
      .set({ depositDeadlineAt: new Date(Date.now() - 1000) })
      .where(eq(orders.id, order.id));
    const missed = await ordersService.enforceDepositDeadlines();
    expect(missed).toBeGreaterThanOrEqual(1);

    const irRes = await request(app)
      .get(`/api/v1/import-requests/${order.importRequestId}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(irRes.body.status).toBe("open");

    // same seller CAN resubmit now — this is the exact bug found during manual verification
    const resubmitRes = await request(app)
      .post(`/api/v1/import-requests/${order.importRequestId}/offers`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ totalPrice: 210, estimatedDeliveryDays: 6, depositPercentage: 20 });
    expect(resubmitRes.status).toBe(201);

    const selectRes = await request(app)
      .post(`/api/v1/offers/${resubmitRes.body.id}/select`)
      .set("Authorization", `Bearer ${customerToken}`);
    await db
      .update(orders)
      .set({ depositDeadlineAt: new Date(Date.now() - 1000) })
      .where(eq(orders.id, selectRes.body.id));
    await ordersService.enforceDepositDeadlines();

    const irFinalRes = await request(app)
      .get(`/api/v1/import-requests/${order.importRequestId}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(irFinalRes.body.status).toBe("closed");
  });

  it("EXPRESS checkout: full payment (no deposit split), stock decrements only after payment succeeds", async () => {
    const category = await categoriesRepository.create({
      nameEn: "Orders Test Category",
      nameAr: "فئة",
      slug: `orders-test-cat-${Date.now()}`,
    });
    const brand = await brandsRepository.create({
      name: "OrdersTestBrand",
      slug: `orders-test-brand-${Date.now()}`,
    });
    const merchant = await createVerifiedUser(uniqueEmail("express-merchant"), "merchant");
    const idAsset = await mediaRepository.create({
      uploaderId: merchant.id,
      kind: "image",
      purpose: "product_image",
      status: "pending",
      mimeType: "image/jpeg",
      sizeBytes: 100,
      originalKey: "uploads/test/express.jpg",
    });
    await mediaRepository.markReady(idAsset.id, {
      processedKey: idAsset.originalKey,
      width: 10,
      height: 10,
    });

    // Verified merchant so the product auto-publishes.
    const docAsset = await mediaRepository.create({
      uploaderId: merchant.id,
      kind: "image",
      purpose: "verification_document",
      status: "pending",
      mimeType: "image/jpeg",
      sizeBytes: 100,
      originalKey: "uploads/test/express-doc.jpg",
    });
    await mediaRepository.markReady(docAsset.id, { processedKey: docAsset.originalKey });
    const merchantToken = await loginAs(app, merchant.email);
    const bizRes = await request(app)
      .post("/api/v1/verification/business")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({ commercialRegistrationMediaAssetId: docAsset.id });
    await verificationRepository.setStatus(bizRes.body.id, "approved");

    const productRes = await request(app)
      .post("/api/v1/merchants/me/products")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({
        name: "Express Test Product",
        categoryId: category.id,
        brandId: brand.id,
        shortDescription: "Test",
        detailedDescription: "Test product for express checkout",
        countryOfOrigin: "China",
        price: 100,
        shippingCost: 10,
        availableQuantity: 5,
        warrantyAvailable: false,
        isComingSoon: false,
        tags: [],
        images: [{ mediaAssetId: idAsset.id, isCover: true, isCountryOfOrigin: true }],
      });
    expect(productRes.body.moderationStatus).toBe("published");

    const customer = await createVerifiedUser(uniqueEmail("express-customer"), "customer");
    const customerToken = await loginAs(app, customer.email);

    const checkoutRes = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productId: productRes.body.id, quantity: 2 });
    expect(checkoutRes.status).toBe(201);
    expect(checkoutRes.body.totalAmount).toBe("220.00"); // (100+10)*2
    expect(checkoutRes.body.depositAmount).toBeNull();

    const productBeforePay = await request(app).get(`/api/v1/products/${productRes.body.id}`);
    expect(productBeforePay.body.availableQuantity).toBe(5); // not decremented yet

    await payDepositAs(app, customerToken, checkoutRes.body.id);

    const productAfterPay = await request(app).get(`/api/v1/products/${productRes.body.id}`);
    expect(productAfterPay.body.availableQuantity).toBe(3);
  });

  it("fulfiller can fetch a single owned order by id, but not one belonging to someone else", async () => {
    const { sellerToken, order } = await createSellerAndOrder(app, 20, 300);

    const ownRes = await request(app)
      .get(`/api/v1/sellers/me/orders/${order.id}`)
      .set("Authorization", `Bearer ${sellerToken}`);
    expect(ownRes.status).toBe(200);
    expect(ownRes.body.id).toBe(order.id);

    const otherSeller = await createVerifiedUser(uniqueEmail("orders-other-seller"), "seller");
    const otherSellerToken = await loginAs(app, otherSeller.email);
    const otherRes = await request(app)
      .get(`/api/v1/sellers/me/orders/${order.id}`)
      .set("Authorization", `Bearer ${otherSellerToken}`);
    expect(otherRes.status).toBe(403);
  });
});

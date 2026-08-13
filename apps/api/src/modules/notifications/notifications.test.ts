import { describe, it, expect } from "vitest";
import request from "supertest";
import {
  createVerifiedUser,
  loginAs,
  createReadyMediaAsset,
  uniqueEmail,
} from "../../test/helpers.js";

const { createApp } = await import("../../app.js");

describe("notifications", () => {
  const app = createApp();

  it("an approved identity verification generates a notification for that user", async () => {
    const customer = await createVerifiedUser(uniqueEmail("notif-customer"));
    const admin = await createVerifiedUser(uniqueEmail("notif-admin"), "admin");
    const token = await loginAs(app, customer.email);
    const adminToken = await loginAs(app, admin.email);

    const idAsset = await createReadyMediaAsset(customer.id);
    const selfieAsset = await createReadyMediaAsset(customer.id);
    const submitRes = await request(app)
      .post("/api/v1/verification/identity")
      .set("Authorization", `Bearer ${token}`)
      .send({ nationalIdMediaAssetId: idAsset, selfieMediaAssetId: selfieAsset });
    expect(submitRes.status).toBe(201);

    const approveRes = await request(app)
      .post(`/api/v1/admin/verification/${submitRes.body.id}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(approveRes.status).toBe(200);

    await new Promise((r) => setTimeout(r, 150)); // fire-and-forget subscriber, same pattern as trust score

    const listRes = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    const notification = listRes.body.find(
      (n: { type: string }) => n.type === "verification_approved",
    );
    expect(notification).toBeDefined();
    expect(notification.readAt).toBeNull();
  });

  it("unread count decrements on mark-read and hits zero on mark-all-read", async () => {
    const customer = await createVerifiedUser(uniqueEmail("notif-unread"));
    const admin = await createVerifiedUser(uniqueEmail("notif-unread-admin"), "admin");
    const token = await loginAs(app, customer.email);
    const adminToken = await loginAs(app, admin.email);

    const idAsset = await createReadyMediaAsset(customer.id);
    const selfieAsset = await createReadyMediaAsset(customer.id);
    const submitRes = await request(app)
      .post("/api/v1/verification/identity")
      .set("Authorization", `Bearer ${token}`)
      .send({ nationalIdMediaAssetId: idAsset, selfieMediaAssetId: selfieAsset });
    await request(app)
      .post(`/api/v1/admin/verification/${submitRes.body.id}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);
    await new Promise((r) => setTimeout(r, 150));

    const unreadBefore = await request(app)
      .get("/api/v1/notifications/unread-count")
      .set("Authorization", `Bearer ${token}`);
    expect(unreadBefore.body.count).toBeGreaterThanOrEqual(1);

    const list = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${token}`);
    const notifId = list.body[0].id as string;

    const markRes = await request(app)
      .post(`/api/v1/notifications/${notifId}/read`)
      .set("Authorization", `Bearer ${token}`);
    expect(markRes.status).toBe(200);
    expect(markRes.body.readAt).not.toBeNull();

    const markAllRes = await request(app)
      .post("/api/v1/notifications/read-all")
      .set("Authorization", `Bearer ${token}`);
    expect(markAllRes.status).toBe(204);

    const unreadAfter = await request(app)
      .get("/api/v1/notifications/unread-count")
      .set("Authorization", `Bearer ${token}`);
    expect(unreadAfter.body.count).toBe(0);
  });

  it("a rejected offer notifies the losing seller (offer.rejected wiring)", async () => {
    const customer = await createVerifiedUser(uniqueEmail("notif-offer-customer"));
    const winningSeller = await createVerifiedUser(uniqueEmail("notif-offer-winner"), "seller");
    const losingSeller = await createVerifiedUser(uniqueEmail("notif-offer-loser"), "seller");
    const customerToken = await loginAs(app, customer.email);
    const winningToken = await loginAs(app, winningSeller.email);
    const losingToken = await loginAs(app, losingSeller.email);

    const irRes = await request(app)
      .post("/api/v1/import-requests")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ links: ["https://shein.com/cart/notif-offer-test"] });

    const winningOfferRes = await request(app)
      .post(`/api/v1/import-requests/${irRes.body.id}/offers`)
      .set("Authorization", `Bearer ${winningToken}`)
      .send({ totalPrice: 300, estimatedDeliveryDays: 5, depositPercentage: 20 });
    await request(app)
      .post(`/api/v1/import-requests/${irRes.body.id}/offers`)
      .set("Authorization", `Bearer ${losingToken}`)
      .send({ totalPrice: 310, estimatedDeliveryDays: 6, depositPercentage: 20 });

    const selectRes = await request(app)
      .post(`/api/v1/offers/${winningOfferRes.body.id}/select`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(selectRes.status).toBe(201);

    await new Promise((r) => setTimeout(r, 150));

    const losingList = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${losingToken}`);
    expect(losingList.body.some((n: { type: string }) => n.type === "offer_rejected")).toBe(true);

    const winningList = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${winningToken}`);
    expect(winningList.body.some((n: { type: string }) => n.type === "offer_selected")).toBe(true);
  });
});

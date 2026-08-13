import { describe, it, expect } from "vitest";
import request from "supertest";
import { createVerifiedUser, loginAs, uniqueEmail } from "../../test/helpers.js";

const { createApp } = await import("../../app.js");
const { sellerProfiles } = await import("../users/schema.js");
const { db } = await import("../../db/index.js");
const { eq } = await import("drizzle-orm");

async function setSellerCountries(userId: string, countries: string[]) {
  await db
    .update(sellerProfiles)
    .set({ importCountries: countries })
    .where(eq(sellerProfiles.userId, userId));
}

describe("import requests + offers", () => {
  const app = createApp();

  it("rejects notes that hint at a price", async () => {
    const customer = await createVerifiedUser(uniqueEmail("price-hint"), "customer");
    const token = await loginAs(app, customer.email);

    const res = await request(app)
      .post("/api/v1/import-requests")
      .set("Authorization", `Bearer ${token}`)
      .send({
        links: ["https://shein.com/cart/1"],
        notes: { preferences: "must be under 50 usd" },
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("distributes only to sellers whose importCountries match sourceCountry", async () => {
    const customer = await createVerifiedUser(uniqueEmail("distribute-customer"), "customer");
    const customerToken = await loginAs(app, customer.email);
    const sellerMatch = await createVerifiedUser(uniqueEmail("distribute-match"), "seller");
    const sellerNoMatch = await createVerifiedUser(uniqueEmail("distribute-nomatch"), "seller");
    await setSellerCountries(sellerMatch.id, ["turkey"]);
    await setSellerCountries(sellerNoMatch.id, ["china"]);
    const matchToken = await loginAs(app, sellerMatch.email);
    const noMatchToken = await loginAs(app, sellerNoMatch.email);

    const createRes = await request(app)
      .post("/api/v1/import-requests")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ links: ["https://shein.com/cart/2"], sourceCountry: "turkey" });
    expect(createRes.status).toBe(201);

    const matchQueue = await request(app)
      .get("/api/v1/sellers/me/import-requests")
      .set("Authorization", `Bearer ${matchToken}`);
    const noMatchQueue = await request(app)
      .get("/api/v1/sellers/me/import-requests")
      .set("Authorization", `Bearer ${noMatchToken}`);

    expect(matchQueue.body.some((r: { id: string }) => r.id === createRes.body.id)).toBe(true);
    expect(noMatchQueue.body.some((r: { id: string }) => r.id === createRes.body.id)).toBe(false);
  });

  it("full offer lifecycle: submit, dedupe, edit, compete, select, auto-reject the rest", async () => {
    const customer = await createVerifiedUser(uniqueEmail("lifecycle-customer"), "customer");
    const customerToken = await loginAs(app, customer.email);
    const sellerA = await createVerifiedUser(uniqueEmail("lifecycle-seller-a"), "seller");
    const sellerB = await createVerifiedUser(uniqueEmail("lifecycle-seller-b"), "seller");
    const tokenA = await loginAs(app, sellerA.email);
    const tokenB = await loginAs(app, sellerB.email);

    const createRes = await request(app)
      .post("/api/v1/import-requests")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ links: ["https://amazon.com/dp/1"] });
    const requestId = createRes.body.id;

    const offerARes = await request(app)
      .post(`/api/v1/import-requests/${requestId}/offers`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ totalPrice: 500, estimatedDeliveryDays: 10, depositPercentage: 20 });
    expect(offerARes.status).toBe(201);

    const dupeRes = await request(app)
      .post(`/api/v1/import-requests/${requestId}/offers`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ totalPrice: 480, estimatedDeliveryDays: 8, depositPercentage: 30 });
    expect(dupeRes.status).toBe(409);

    // rejects a deposit percentage outside the fixed 20/30/40/50 set
    const badDepositRes = await request(app)
      .post(`/api/v1/import-requests/${requestId}/offers`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ totalPrice: 450, estimatedDeliveryDays: 12, depositPercentage: 25 });
    expect(badDepositRes.status).toBe(422);

    const offerBRes = await request(app)
      .post(`/api/v1/import-requests/${requestId}/offers`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ totalPrice: 450, estimatedDeliveryDays: 12, depositPercentage: 40 });
    expect(offerBRes.status).toBe(201);

    const selectRes = await request(app)
      .post(`/api/v1/offers/${offerBRes.body.id}/select`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(selectRes.status).toBe(201);
    expect(selectRes.body.stage).toBe("awaiting_deposit");
    expect(selectRes.body.depositAmount).toBe("180.00"); // 450 * 40%
    expect(selectRes.body.sellerId).toBe(sellerB.id);
    expect(new Date(selectRes.body.depositDeadlineAt).getTime()).toBeGreaterThan(Date.now());

    const offersAfter = await request(app)
      .get(`/api/v1/import-requests/${requestId}/offers`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(offersAfter.body).toHaveLength(0); // both active offers are gone: one selected, one rejected

    const lateOfferRes = await request(app)
      .post(`/api/v1/import-requests/${requestId}/offers`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ totalPrice: 400, estimatedDeliveryDays: 5, depositPercentage: 20 });
    expect(lateOfferRes.status).toBe(409);
  });

  it("a seller can edit their offer until selection, and cancel it entirely", async () => {
    const customer = await createVerifiedUser(uniqueEmail("edit-customer"), "customer");
    const customerToken = await loginAs(app, customer.email);
    const seller = await createVerifiedUser(uniqueEmail("edit-seller"), "seller");
    const sellerToken = await loginAs(app, seller.email);

    const createRes = await request(app)
      .post("/api/v1/import-requests")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ links: ["https://trendyol.com/p/1"] });

    const offerRes = await request(app)
      .post(`/api/v1/import-requests/${createRes.body.id}/offers`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ totalPrice: 300, estimatedDeliveryDays: 7, depositPercentage: 20 });

    const editRes = await request(app)
      .patch(`/api/v1/offers/${offerRes.body.id}`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ totalPrice: 275 });
    expect(editRes.status).toBe(200);
    expect(editRes.body.totalPrice).toBe("275.00");

    const cancelRes = await request(app)
      .delete(`/api/v1/offers/${offerRes.body.id}`)
      .set("Authorization", `Bearer ${sellerToken}`);
    expect(cancelRes.status).toBe(204);

    const editAfterCancelRes = await request(app)
      .patch(`/api/v1/offers/${offerRes.body.id}`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ totalPrice: 260 });
    expect(editAfterCancelRes.status).toBe(409);
  });

  it("a customer cannot select another customer's offer, and a seller cannot select any offer", async () => {
    const customer = await createVerifiedUser(uniqueEmail("owner-customer"), "customer");
    const intruder = await createVerifiedUser(uniqueEmail("intruder-customer"), "customer");
    const seller = await createVerifiedUser(uniqueEmail("select-seller"), "seller");
    const customerToken = await loginAs(app, customer.email);
    const intruderToken = await loginAs(app, intruder.email);
    const sellerToken = await loginAs(app, seller.email);

    const createRes = await request(app)
      .post("/api/v1/import-requests")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ links: ["https://shein.com/cart/3"] });
    const offerRes = await request(app)
      .post(`/api/v1/import-requests/${createRes.body.id}/offers`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ totalPrice: 100, estimatedDeliveryDays: 5, depositPercentage: 20 });

    const intruderSelectRes = await request(app)
      .post(`/api/v1/offers/${offerRes.body.id}/select`)
      .set("Authorization", `Bearer ${intruderToken}`);
    expect(intruderSelectRes.status).toBe(403);

    const sellerSelectRes = await request(app)
      .post(`/api/v1/offers/${offerRes.body.id}/select`)
      .set("Authorization", `Bearer ${sellerToken}`);
    expect(sellerSelectRes.status).toBe(403);
  });

  it("scopes the offers list: owning customer sees all, a bidding seller sees only their own, an uninvolved seller is forbidden", async () => {
    const customer = await createVerifiedUser(uniqueEmail("scope-customer"), "customer");
    const customerToken = await loginAs(app, customer.email);
    const sellerA = await createVerifiedUser(uniqueEmail("scope-seller-a"), "seller");
    const sellerB = await createVerifiedUser(uniqueEmail("scope-seller-b"), "seller");
    const outsider = await createVerifiedUser(uniqueEmail("scope-outsider"), "seller");
    const tokenA = await loginAs(app, sellerA.email);
    const tokenB = await loginAs(app, sellerB.email);
    const outsiderToken = await loginAs(app, outsider.email);

    const createRes = await request(app)
      .post("/api/v1/import-requests")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ links: ["https://amazon.com/dp/2"] });
    const requestId = createRes.body.id;

    await request(app)
      .post(`/api/v1/import-requests/${requestId}/offers`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ totalPrice: 500, estimatedDeliveryDays: 10, depositPercentage: 20 });
    await request(app)
      .post(`/api/v1/import-requests/${requestId}/offers`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ totalPrice: 450, estimatedDeliveryDays: 12, depositPercentage: 40 });

    const asCustomer = await request(app)
      .get(`/api/v1/import-requests/${requestId}/offers`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(asCustomer.status).toBe(200);
    expect(asCustomer.body).toHaveLength(2);

    const asSellerA = await request(app)
      .get(`/api/v1/import-requests/${requestId}/offers`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(asSellerA.status).toBe(200);
    expect(asSellerA.body).toHaveLength(1);
    expect(asSellerA.body[0].sellerId).toBe(sellerA.id);

    const asOutsider = await request(app)
      .get(`/api/v1/import-requests/${requestId}/offers`)
      .set("Authorization", `Bearer ${outsiderToken}`);
    expect(asOutsider.status).toBe(403);
  });

  it("blocks a seller from viewing an import request they were never matched to and never bid on", async () => {
    const customer = await createVerifiedUser(uniqueEmail("idor-customer"), "customer");
    const customerToken = await loginAs(app, customer.email);
    const matchedSeller = await createVerifiedUser(uniqueEmail("idor-matched"), "seller");
    const unmatchedSeller = await createVerifiedUser(uniqueEmail("idor-unmatched"), "seller");
    await setSellerCountries(matchedSeller.id, ["turkey"]);
    await setSellerCountries(unmatchedSeller.id, ["china"]);
    const matchedToken = await loginAs(app, matchedSeller.email);
    const unmatchedToken = await loginAs(app, unmatchedSeller.email);

    const createRes = await request(app)
      .post("/api/v1/import-requests")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ links: ["https://shein.com/cart/4"], sourceCountry: "turkey" });
    const requestId = createRes.body.id;

    const matchedDetail = await request(app)
      .get(`/api/v1/sellers/me/import-requests/${requestId}`)
      .set("Authorization", `Bearer ${matchedToken}`);
    expect(matchedDetail.status).toBe(200);

    const unmatchedDetail = await request(app)
      .get(`/api/v1/sellers/me/import-requests/${requestId}`)
      .set("Authorization", `Bearer ${unmatchedToken}`);
    expect(unmatchedDetail.status).toBe(404);

    // Bidding grants visibility even without a country match — submitting an
    // offer by request id isn't itself country-gated, only the queue listing is.
    await request(app)
      .post(`/api/v1/import-requests/${requestId}/offers`)
      .set("Authorization", `Bearer ${unmatchedToken}`)
      .send({ totalPrice: 200, estimatedDeliveryDays: 5, depositPercentage: 20 });

    const afterBidDetail = await request(app)
      .get(`/api/v1/sellers/me/import-requests/${requestId}`)
      .set("Authorization", `Bearer ${unmatchedToken}`);
    expect(afterBidDetail.status).toBe(200);
  });
});

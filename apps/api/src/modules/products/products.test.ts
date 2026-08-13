import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import {
  createVerifiedUser,
  loginAs,
  createReadyMediaAsset,
  uniqueEmail,
} from "../../test/helpers.js";

const { createApp } = await import("../../app.js");
const { categoriesRepository } = await import("../categories/repository.js");
const { brandsRepository } = await import("../brands/repository.js");
const { verificationRepository } = await import("../verification/repository.js");

describe("products", () => {
  const app = createApp();
  let categoryId: string;
  let brandId: string;

  beforeAll(async () => {
    const category = await categoriesRepository.create({
      nameEn: "Test Category",
      nameAr: "فئة اختبار",
      slug: `test-cat-${Date.now()}`,
    });
    categoryId = category.id;
    const brand = await brandsRepository.create({
      name: "Test Brand",
      slug: `test-brand-${Date.now()}`,
    });
    brandId = brand.id;
  });

  function productPayload(overrides: Record<string, unknown> = {}, imageAssetId: string) {
    return {
      name: "Bluetooth Speaker",
      categoryId,
      brandId,
      shortDescription: "Loud and portable",
      detailedDescription: "A detailed description of a bluetooth speaker.",
      countryOfOrigin: "China",
      price: 499.5,
      shippingCost: 25,
      availableQuantity: 10,
      warrantyAvailable: true,
      isComingSoon: false,
      tags: ["audio", "bluetooth"],
      images: [{ mediaAssetId: imageAssetId, isCover: true, isCountryOfOrigin: true }],
      ...overrides,
    };
  }

  it("unverified seller's product is published=pending_review and hidden from public browse", async () => {
    const seller = await createVerifiedUser(uniqueEmail("unverified-seller"), "seller");
    const token = await loginAs(app, seller.email);
    const imageAsset = await createReadyMediaAsset(seller.id, "product_image");

    const createRes = await request(app)
      .post("/api/v1/sellers/me/products")
      .set("Authorization", `Bearer ${token}`)
      .send(productPayload({}, imageAsset));
    expect(createRes.status).toBe(201);
    expect(createRes.body.moderationStatus).toBe("pending_review");

    const publicRes = await request(app).get(`/api/v1/products/${createRes.body.id}`);
    expect(publicRes.status).toBe(404);
  });

  it("verified seller's product auto-publishes and becomes publicly browsable", async () => {
    const seller = await createVerifiedUser(uniqueEmail("verified-seller"), "seller");
    // Approve identity verification directly (bypassing the doc-upload flow, already covered in verification.test.ts).
    const idAsset = await createReadyMediaAsset(seller.id);
    const selfieAsset = await createReadyMediaAsset(seller.id);
    const verificationToken = await loginAs(app, seller.email);
    const submitRes = await request(app)
      .post("/api/v1/verification/identity")
      .set("Authorization", `Bearer ${verificationToken}`)
      .send({ nationalIdMediaAssetId: idAsset, selfieMediaAssetId: selfieAsset });
    await verificationRepository.setStatus(submitRes.body.id, "approved");

    const imageAsset = await createReadyMediaAsset(seller.id, "product_image");
    const createRes = await request(app)
      .post("/api/v1/sellers/me/products")
      .set("Authorization", `Bearer ${verificationToken}`)
      .send(productPayload({ name: "Verified Seller Gadget" }, imageAsset));
    expect(createRes.status).toBe(201);
    expect(createRes.body.moderationStatus).toBe("published");
    expect(createRes.body.status).toBe("available"); // quantity 10, not coming soon

    const publicRes = await request(app).get(`/api/v1/products/${createRes.body.id}`);
    expect(publicRes.status).toBe(200);

    const browseRes = await request(app)
      .get("/api/v1/products")
      .query({ q: "Verified Seller Gadget" });
    expect(browseRes.status).toBe(200);
    expect(browseRes.body.items.some((p: { id: string }) => p.id === createRes.body.id)).toBe(true);
  });

  it("derives out_of_stock at quantity 0 and coming_soon overrides quantity entirely", async () => {
    const seller = await createVerifiedUser(uniqueEmail("status-seller"), "seller");
    const token = await loginAs(app, seller.email);
    const imageAsset = await createReadyMediaAsset(seller.id, "product_image");

    const outOfStock = await request(app)
      .post("/api/v1/sellers/me/products")
      .set("Authorization", `Bearer ${token}`)
      .send(productPayload({ availableQuantity: 0 }, imageAsset));
    expect(outOfStock.body.status).toBe("out_of_stock");

    const imageAsset2 = await createReadyMediaAsset(seller.id, "product_image");
    const comingSoon = await request(app)
      .post("/api/v1/sellers/me/products")
      .set("Authorization", `Bearer ${token}`)
      .send(productPayload({ availableQuantity: 50, isComingSoon: true }, imageAsset2));
    expect(comingSoon.body.status).toBe("coming_soon");
  });

  it("requires exactly one cover image and rejects a seller editing another seller's product", async () => {
    const sellerA = await createVerifiedUser(uniqueEmail("owner-a"), "seller");
    const sellerB = await createVerifiedUser(uniqueEmail("owner-b"), "seller");
    const tokenA = await loginAs(app, sellerA.email);
    const tokenB = await loginAs(app, sellerB.email);
    const imageAsset = await createReadyMediaAsset(sellerA.id, "product_image");

    const noCoverRes = await request(app)
      .post("/api/v1/sellers/me/products")
      .set("Authorization", `Bearer ${tokenA}`)
      .send(
        productPayload(
          { images: [{ mediaAssetId: imageAsset, isCover: false, isCountryOfOrigin: true }] },
          imageAsset,
        ),
      );
    expect(noCoverRes.status).toBe(422);

    const createRes = await request(app)
      .post("/api/v1/sellers/me/products")
      .set("Authorization", `Bearer ${tokenA}`)
      .send(productPayload({}, imageAsset));
    expect(createRes.status).toBe(201);

    const hijackRes = await request(app)
      .patch(`/api/v1/sellers/me/products/${createRes.body.id}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ price: 1 });
    expect(hijackRes.status).toBe(403);
  });

  it("a merchant cannot create a product through the seller-scoped route", async () => {
    const merchant = await createVerifiedUser(uniqueEmail("merchant-only"), "merchant");
    const token = await loginAs(app, merchant.email);
    const imageAsset = await createReadyMediaAsset(merchant.id, "product_image");

    const res = await request(app)
      .post("/api/v1/sellers/me/products")
      .set("Authorization", `Bearer ${token}`)
      .send(productPayload({}, imageAsset));
    expect(res.status).toBe(403);
  });
});

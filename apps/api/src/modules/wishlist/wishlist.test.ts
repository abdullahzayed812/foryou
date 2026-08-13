import { describe, it, expect } from "vitest";
import request from "supertest";
import type { Express } from "express";
import {
  createVerifiedUser,
  loginAs,
  createReadyMediaAsset,
  uniqueEmail,
} from "../../test/helpers.js";

const { createApp } = await import("../../app.js");

async function createPublishedProduct(app: Express, adminToken: string) {
  const seller = await createVerifiedUser(uniqueEmail("wishlist-seller"), "seller");
  const sellerToken = await loginAs(app, seller.email);
  const suffix = Date.now().toString();

  const catRes = await request(app)
    .post("/api/v1/admin/categories")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ nameEn: "Wishlist Cat", nameAr: "فئة", slug: `wishlist-cat-${suffix}` });
  const brandRes = await request(app)
    .post("/api/v1/admin/brands")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "Wishlist Brand", slug: `wishlist-brand-${suffix}` });
  const imageAsset = await createReadyMediaAsset(seller.id, "product_image");

  const productRes = await request(app)
    .post("/api/v1/sellers/me/products")
    .set("Authorization", `Bearer ${sellerToken}`)
    .send({
      name: `Wishlist Widget ${suffix}`,
      categoryId: catRes.body.id,
      brandId: brandRes.body.id,
      shortDescription: "desc",
      detailedDescription: "detailed description",
      countryOfOrigin: "Turkey",
      price: 40,
      shippingCost: 5,
      availableQuantity: 3,
      warrantyAvailable: true,
      isComingSoon: false,
      tags: ["wishlist"],
      images: [{ mediaAssetId: imageAsset, isCover: true, isCountryOfOrigin: true }],
    });
  await request(app)
    .post(`/api/v1/admin/products/${productRes.body.id}/approve`)
    .set("Authorization", `Bearer ${adminToken}`);
  return productRes.body.id as string;
}

describe("wishlist", () => {
  const app = createApp();

  it("customer can add, list, and remove a product; adding twice is idempotent", async () => {
    const admin = await createVerifiedUser(uniqueEmail("wishlist-admin"), "admin");
    const adminToken = await loginAs(app, admin.email);
    const productId = await createPublishedProduct(app, adminToken);

    const customer = await createVerifiedUser(uniqueEmail("wishlist-customer"));
    const customerToken = await loginAs(app, customer.email);

    const addRes = await request(app)
      .post(`/api/v1/wishlist/${productId}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(addRes.status).toBe(204);

    const addAgainRes = await request(app)
      .post(`/api/v1/wishlist/${productId}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(addAgainRes.status).toBe(204);

    const listRes = await request(app)
      .get("/api/v1/wishlist/me")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(listRes.status).toBe(200);
    expect(
      listRes.body.filter((w: { productId: string }) => w.productId === productId),
    ).toHaveLength(1);
    expect(listRes.body[0].product.id).toBe(productId);
    // Regression guard: the nested product must carry a full, ready-to-render
    // shape (images with a usable `url`, not just a bare row) — the web
    // dashboard's ProductCard crashes on `product.images.find(...)` when
    // this join is missing.
    expect(Array.isArray(listRes.body[0].product.images)).toBe(true);
    expect(listRes.body[0].product.images.length).toBeGreaterThan(0);
    expect(listRes.body[0].product.images[0].url).toBeTruthy();
    expect(listRes.body[0].product.images[0].mediaAsset).toBeUndefined();

    const removeRes = await request(app)
      .delete(`/api/v1/wishlist/${productId}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(removeRes.status).toBe(204);

    const listAfterRes = await request(app)
      .get("/api/v1/wishlist/me")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(listAfterRes.body.some((w: { productId: string }) => w.productId === productId)).toBe(
      false,
    );
  });

  it("adding a nonexistent product is rejected", async () => {
    const customer = await createVerifiedUser(uniqueEmail("wishlist-404-customer"));
    const customerToken = await loginAs(app, customer.email);

    const res = await request(app)
      .post("/api/v1/wishlist/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(404);
  });

  it("only customers can use the wishlist", async () => {
    const seller = await createVerifiedUser(uniqueEmail("wishlist-seller-role"), "seller");
    const sellerToken = await loginAs(app, seller.email);

    const res = await request(app)
      .get("/api/v1/wishlist/me")
      .set("Authorization", `Bearer ${sellerToken}`);
    expect(res.status).toBe(403);
  });
});

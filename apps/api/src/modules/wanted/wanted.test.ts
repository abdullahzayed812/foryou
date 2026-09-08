import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createVerifiedUser, loginAs, createReadyMediaAsset, uniqueEmail } from "../../test/helpers.js";

const { createApp } = await import("../../app.js");
const { categoriesRepository } = await import("../categories/repository.js");
const { brandsRepository } = await import("../brands/repository.js");
const { ordersService } = await import("../orders/service.js");
const { notificationsRepository } = await import("../notifications/repository.js");
const { productsRepository } = await import("../products/repository.js");

describe("FOR YOU WANTED → EXPRESS lifecycle", () => {
  const app: Express = createApp();
  let categoryId: string;
  let brandId: string;

  beforeAll(async () => {
    categoryId = (
      await categoriesRepository.create({
        nameEn: "Wanted Cat",
        nameAr: "فئة",
        slug: `wanted-cat-${Date.now()}`,
      })
    ).id;
    brandId = (
      await brandsRepository.create({ name: "Wanted Brand", slug: `wanted-brand-${Date.now()}` })
    ).id;
  });

  async function createSeller() {
    const seller = await createVerifiedUser(uniqueEmail("wanted-seller"), "seller");
    const token = await loginAs(app, seller.email);
    return { seller, token };
  }

  async function createProduct(
    token: string,
    sellerId: string,
    overrides: Record<string, unknown> = {},
  ) {
    const imageAsset = await createReadyMediaAsset(sellerId, "product_image");
    const res = await request(app)
      .post("/api/v1/sellers/me/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: `Wanted Widget ${Date.now()}-${Math.random()}`,
        categoryId,
        brandId,
        shortDescription: "desc",
        detailedDescription: "detailed description here",
        countryOfOrigin: "Turkey",
        price: 100,
        shippingCost: 10,
        availableQuantity: 0,
        warrantyAvailable: false,
        isComingSoon: false,
        tags: [],
        images: [{ mediaAssetId: imageAsset, isCover: true, isCountryOfOrigin: true }],
        ...overrides,
      });
    expect(res.status).toBe(201);
    // Publish it (skip the verification/admin dance — covered elsewhere) so
    // it's publicly visible and EXPRESS-checkoutable once it reaches EXPRESS.
    await productsRepository.update(res.body.id, { moderationStatus: "published" });
    return { ...res.body, moderationStatus: "published" };
  }

  async function customer(prefix: string) {
    const u = await createVerifiedUser(uniqueEmail(prefix), "customer");
    return { u, token: await loginAs(app, u.email) };
  }

  it("runs a full WANTED cycle: like/notify → importing → EXPRESS, keeping the same product id", async () => {
    const { seller, token } = await createSeller();
    const product = await createProduct(token, seller.id, { startAsWanted: true });

    expect(product.lifecycle).toBe("wanted");
    expect(product.status).toBe("coming_soon");

    const a = await customer("wanted-liker-a");
    const b = await customer("wanted-notify-b");

    // ❤️ two likes, 🔔 one notify request — kept separate.
    await request(app)
      .post(`/api/v1/products/${product.id}/wanted/like`)
      .set("Authorization", `Bearer ${a.token}`)
      .expect(204);
    await request(app)
      .post(`/api/v1/products/${product.id}/wanted/like`)
      .set("Authorization", `Bearer ${b.token}`)
      .expect(204);
    // idempotent
    await request(app)
      .post(`/api/v1/products/${product.id}/wanted/like`)
      .set("Authorization", `Bearer ${b.token}`)
      .expect(204);
    await request(app)
      .post(`/api/v1/products/${product.id}/wanted/notify`)
      .set("Authorization", `Bearer ${b.token}`)
      .expect(204);

    const view = await request(app)
      .get(`/api/v1/products/${product.id}/wanted`)
      .set("Authorization", `Bearer ${b.token}`);
    expect(view.body.lifecycle).toBe("wanted");
    expect(view.body.cycle.cycleNumber).toBe(1);
    expect(view.body.cycle.likeCount).toBe(2);
    expect(view.body.cycle.notifyCount).toBe(1);
    expect(view.body.viewerLiked).toBe(true);
    expect(view.body.viewerNotified).toBe(true);

    // Not purchasable while WANTED.
    await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ productId: product.id, quantity: 1 })
      .expect(409);

    // → IMPORTING: interactions freeze.
    await request(app)
      .post(`/api/v1/sellers/me/products/${product.id}/wanted/importing`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    await request(app)
      .post(`/api/v1/products/${product.id}/wanted/like`)
      .set("Authorization", `Bearer ${a.token}`)
      .expect(409);

    // → EXPRESS: stock added, notify fan-out fired once.
    const done = await request(app)
      .post(`/api/v1/sellers/me/products/${product.id}/wanted/complete-import`)
      .set("Authorization", `Bearer ${token}`)
      .send({ importedQuantity: 60 });
    expect(done.status).toBe(200);
    expect(done.body.status).toBe("completed");
    expect(done.body.importedQuantity).toBe(60);

    const expressProduct = await request(app).get(`/api/v1/products/${product.id}`);
    expect(expressProduct.body.id).toBe(product.id); // same id across the whole lifecycle
    expect(expressProduct.body.lifecycle).toBe("express");
    expect(expressProduct.body.availableQuantity).toBe(60);
    expect(expressProduct.body.status).toBe("available");

    // EXPRESS shows no current WANTED engagement (counters are historical now).
    const expressView = await request(app).get(`/api/v1/products/${product.id}/wanted`);
    expect(expressView.body.lifecycle).toBe("express");
    expect(expressView.body.cycle).toBeNull();

    // 🔔 requester B was notified exactly once; ❤️-only A was not.
    await new Promise((r) => setTimeout(r, 50)); // fire-and-forget notify
    const bNotifs = await notificationsRepository.listForUser(b.u.id);
    const wanted = bNotifs.filter((n) => n.type === "product_wanted_available");
    expect(wanted).toHaveLength(1);
    expect(wanted[0]!.body).toContain("FOR YOU EXPRESS");
    const aNotifs = await notificationsRepository.listForUser(a.u.id);
    expect(aNotifs.filter((n) => n.type === "product_wanted_available")).toHaveLength(0);
  });

  it("computes cycle analytics from real orders, and cycle #2 never mutates cycle #1", async () => {
    const { seller, token } = await createSeller();
    const product = await createProduct(token, seller.id, { startAsWanted: true });
    const b = await customer("wanted-analytics-b");

    await request(app)
      .post(`/api/v1/products/${product.id}/wanted/like`)
      .set("Authorization", `Bearer ${b.token}`)
      .expect(204);
    await request(app)
      .post(`/api/v1/products/${product.id}/wanted/notify`)
      .set("Authorization", `Bearer ${b.token}`)
      .expect(204);
    await request(app)
      .post(`/api/v1/sellers/me/products/${product.id}/wanted/complete-import`)
      .set("Authorization", `Bearer ${token}`)
      .send({ importedQuantity: 10 })
      .expect(200);

    // B (a notify requester) actually buys 2 units on EXPRESS.
    const order = await ordersService.createExpressCheckout(b.u.id, product.id, 2);
    await ordersService.markPaid(order.id);

    let cycles = (
      await request(app)
        .get(`/api/v1/sellers/me/products/${product.id}/wanted/cycles`)
        .set("Authorization", `Bearer ${token}`)
    ).body;
    expect(cycles).toHaveLength(1);
    expect(cycles[0].cycleNumber).toBe(1);
    expect(cycles[0].likes).toBe(1);
    expect(cycles[0].notifyRequests).toBe(1);
    expect(cycles[0].importedQuantity).toBe(10);
    expect(cycles[0].unitsSold).toBe(2);
    expect(cycles[0].remainingStock).toBe(8);
    expect(cycles[0].notifyToPurchase).toEqual({ notified: 1, purchased: 1, rate: 1 });

    // Sell out, then open WANTED cycle #2.
    await ordersService.createExpressCheckout(b.u.id, product.id, 8).then((o) => ordersService.markPaid(o.id));
    await request(app)
      .post(`/api/v1/sellers/me/products/${product.id}/wanted/start`)
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    const c = await customer("wanted-cycle2-c");
    await request(app)
      .post(`/api/v1/products/${product.id}/wanted/like`)
      .set("Authorization", `Bearer ${c.token}`)
      .expect(204);

    cycles = (
      await request(app)
        .get(`/api/v1/sellers/me/products/${product.id}/wanted/cycles`)
        .set("Authorization", `Bearer ${token}`)
    ).body;
    expect(cycles).toHaveLength(2);
    const cycle1 = cycles.find((x: { cycleNumber: number }) => x.cycleNumber === 1);
    const cycle2 = cycles.find((x: { cycleNumber: number }) => x.cycleNumber === 2);
    expect(cycle1.likes).toBe(1); // untouched
    expect(cycle1.status).toBe("completed");
    expect(cycle1.unitsSold).toBe(10);
    expect(cycle2.likes).toBe(1);
    expect(cycle2.status).toBe("active");
    expect(cycle2.notifyToPurchase).toBeNull();
  });

  it("only the owner can drive lifecycle transitions", async () => {
    const { seller, token } = await createSeller();
    const product = await createProduct(token, seller.id, { startAsWanted: true });
    const { token: otherToken } = await createSeller();

    await request(app)
      .post(`/api/v1/sellers/me/products/${product.id}/wanted/importing`)
      .set("Authorization", `Bearer ${otherToken}`)
      .expect(403);
  });

  it("a normal EXPRESS product exposes no WANTED cycle", async () => {
    const { seller, token } = await createSeller();
    const product = await createProduct(token, seller.id, { availableQuantity: 5 });
    expect(product.lifecycle).toBe("express");

    const view = await request(app).get(`/api/v1/products/${product.id}/wanted`);
    expect(view.body.lifecycle).toBe("express");
    expect(view.body.cycle).toBeNull();
  });
});

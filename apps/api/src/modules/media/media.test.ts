import { describe, it, expect } from "vitest";
import request from "supertest";
import { createVerifiedUser, createReadyMediaAsset, loginAs, uniqueEmail } from "../../test/helpers.js";

const { createApp } = await import("../../app.js");

describe("media asset ownership", () => {
  const app = createApp();

  it("lets the uploader read their own asset", async () => {
    const owner = await createVerifiedUser(uniqueEmail("media-owner"), "customer");
    const ownerToken = await loginAs(app, owner.email);
    const assetId = await createReadyMediaAsset(owner.id);

    const res = await request(app)
      .get(`/api/v1/media/uploads/${assetId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(assetId);
  });

  it("blocks a different authenticated user from reading someone else's asset", async () => {
    const owner = await createVerifiedUser(uniqueEmail("media-owner2"), "customer");
    const intruder = await createVerifiedUser(uniqueEmail("media-intruder"), "customer");
    const intruderToken = await loginAs(app, intruder.email);
    const assetId = await createReadyMediaAsset(owner.id);

    const res = await request(app)
      .get(`/api/v1/media/uploads/${assetId}`)
      .set("Authorization", `Bearer ${intruderToken}`);

    expect(res.status).toBe(403);
  });

  it("lets an admin read any asset", async () => {
    const owner = await createVerifiedUser(uniqueEmail("media-owner3"), "customer");
    const admin = await createVerifiedUser(uniqueEmail("media-admin"), "admin");
    const adminToken = await loginAs(app, admin.email);
    const assetId = await createReadyMediaAsset(owner.id);

    const res = await request(app)
      .get(`/api/v1/media/uploads/${assetId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});

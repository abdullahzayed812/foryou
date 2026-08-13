import { describe, it, expect } from "vitest";
import request from "supertest";
import { mediaRepository } from "../media/repository.js";
import {
  createVerifiedUser,
  loginAs,
  createReadyMediaAsset,
  uniqueEmail,
} from "../../test/helpers.js";

const { createApp } = await import("../../app.js");

describe("verification + trust score", () => {
  const app = createApp();

  it("rejects identity submission when a document isn't ready yet", async () => {
    const user = await createVerifiedUser(uniqueEmail("pending-doc"));
    const token = await loginAs(app, user.email);

    const pendingAsset = await mediaRepository.create({
      uploaderId: user.id,
      kind: "image",
      purpose: "verification_document",
      status: "pending",
      mimeType: "image/jpeg",
      sizeBytes: 100,
      originalKey: "uploads/test/still-pending.jpg",
    });
    const readyAsset = await createReadyMediaAsset(user.id);

    const res = await request(app)
      .post("/api/v1/verification/identity")
      .set("Authorization", `Bearer ${token}`)
      .send({ nationalIdMediaAssetId: pendingAsset.id, selfieMediaAssetId: readyAsset });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("full flow: submit → admin queue → approve → badge stays 'average' at default score", async () => {
    const customer = await createVerifiedUser(uniqueEmail("full-flow"));
    const admin = await createVerifiedUser(uniqueEmail("admin-full-flow"), "admin");
    const token = await loginAs(app, customer.email);
    const adminToken = await loginAs(app, admin.email);

    const idAsset = await createReadyMediaAsset(customer.id);
    const selfieAsset = await createReadyMediaAsset(customer.id);

    const submitRes = await request(app)
      .post("/api/v1/verification/identity")
      .set("Authorization", `Bearer ${token}`)
      .send({ nationalIdMediaAssetId: idAsset, selfieMediaAssetId: selfieAsset });
    expect(submitRes.status).toBe(201);
    expect(submitRes.body.status).toBe("pending");
    const requestId = submitRes.body.id;

    // duplicate submission while pending must be rejected
    const dupeRes = await request(app)
      .post("/api/v1/verification/identity")
      .set("Authorization", `Bearer ${token}`)
      .send({ nationalIdMediaAssetId: idAsset, selfieMediaAssetId: selfieAsset });
    expect(dupeRes.status).toBe(409);

    const queueRes = await request(app)
      .get("/api/v1/admin/verification/queue")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(queueRes.status).toBe(200);
    expect(queueRes.body.some((r: { id: string }) => r.id === requestId)).toBe(true);

    // non-admin cannot access the queue
    const forbiddenRes = await request(app)
      .get("/api/v1/admin/verification/queue")
      .set("Authorization", `Bearer ${token}`);
    expect(forbiddenRes.status).toBe(403);

    const approveRes = await request(app)
      .post(`/api/v1/admin/verification/${requestId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe("approved");

    const badgeRes = await request(app)
      .get("/api/v1/users/me/trust")
      .set("Authorization", `Bearer ${token}`);
    expect(badgeRes.status).toBe(200);
    expect(badgeRes.body.level).toBe("average"); // score still 50 — verification approval doesn't move it (BRD doesn't say it should)

    const numericRes = await request(app)
      .get(`/api/v1/admin/users/${customer.id}/trust-score`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(numericRes.status).toBe(200);
    expect(numericRes.body.score).toBe(50);

    // non-admin cannot read the numeric score, even for their own account
    const numericForbidden = await request(app)
      .get(`/api/v1/admin/users/${customer.id}/trust-score`)
      .set("Authorization", `Bearer ${token}`);
    expect(numericForbidden.status).toBe(403);
  });

  it("rejection carries a reason and blocks resubmission until reviewed again", async () => {
    const customer = await createVerifiedUser(uniqueEmail("rejected-flow"));
    const admin = await createVerifiedUser(uniqueEmail("admin-rejected-flow"), "admin");
    const token = await loginAs(app, customer.email);
    const adminToken = await loginAs(app, admin.email);

    const idAsset = await createReadyMediaAsset(customer.id);
    const selfieAsset = await createReadyMediaAsset(customer.id);
    const submitRes = await request(app)
      .post("/api/v1/verification/identity")
      .set("Authorization", `Bearer ${token}`)
      .send({ nationalIdMediaAssetId: idAsset, selfieMediaAssetId: selfieAsset });
    const requestId = submitRes.body.id;

    const rejectRes = await request(app)
      .post(`/api/v1/admin/verification/${requestId}/reject`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Selfie doesn't match the ID photo" });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.status).toBe("rejected");
    expect(rejectRes.body.rejectionReason).toBe("Selfie doesn't match the ID photo");

    // rejected is terminal, not "live" — user can submit a brand new request
    const idAsset2 = await createReadyMediaAsset(customer.id);
    const selfieAsset2 = await createReadyMediaAsset(customer.id);
    const resubmitRes = await request(app)
      .post("/api/v1/verification/identity")
      .set("Authorization", `Bearer ${token}`)
      .send({ nationalIdMediaAssetId: idAsset2, selfieMediaAssetId: selfieAsset2 });
    expect(resubmitRes.status).toBe(201);
  });
});

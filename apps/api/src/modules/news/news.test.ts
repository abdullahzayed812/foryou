import { describe, it, expect } from "vitest";
import request from "supertest";
import { createVerifiedUser, loginAs, uniqueEmail } from "../../test/helpers.js";

const { createApp } = await import("../../app.js");

describe("news & trends", () => {
  const app = createApp();

  it("a draft post is admin-only visible; publishing makes it public; deleting removes it", async () => {
    const admin = await createVerifiedUser(uniqueEmail("news-admin"), "admin");
    const adminToken = await loginAs(app, admin.email);

    const createRes = await request(app)
      .post("/api/v1/admin/news")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Test Post", body: "Body text" });
    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe("draft");
    const postId = createRes.body.id as string;

    const publicHiddenRes = await request(app).get(`/api/v1/news/${postId}`);
    expect(publicHiddenRes.status).toBe(404);

    const publicListRes = await request(app).get("/api/v1/news");
    expect(publicListRes.body.some((p: { id: string }) => p.id === postId)).toBe(false);

    const publishRes = await request(app)
      .post(`/api/v1/admin/news/${postId}/publish`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(publishRes.status).toBe(200);
    expect(publishRes.body.status).toBe("published");
    expect(publishRes.body.publishedAt).not.toBeNull();

    const publicVisibleRes = await request(app).get(`/api/v1/news/${postId}`);
    expect(publicVisibleRes.status).toBe(200);

    const publicListAfterRes = await request(app).get("/api/v1/news");
    expect(publicListAfterRes.body.some((p: { id: string }) => p.id === postId)).toBe(true);

    const unpublishRes = await request(app)
      .post(`/api/v1/admin/news/${postId}/unpublish`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(unpublishRes.status).toBe(200);
    expect(unpublishRes.body.status).toBe("draft");
    const hiddenAgainRes = await request(app).get(`/api/v1/news/${postId}`);
    expect(hiddenAgainRes.status).toBe(404);

    const deleteRes = await request(app)
      .delete(`/api/v1/admin/news/${postId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(204);

    const adminListRes = await request(app)
      .get("/api/v1/admin/news")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminListRes.body.some((p: { id: string }) => p.id === postId)).toBe(false);
  });

  it("non-admins can't create news posts", async () => {
    const customer = await createVerifiedUser(uniqueEmail("news-customer"));
    const customerToken = await loginAs(app, customer.email);

    const res = await request(app)
      .post("/api/v1/admin/news")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ title: "Nope", body: "Nope" });
    expect(res.status).toBe(403);
  });

  it("editing an existing post updates its content without resetting publish status", async () => {
    const admin = await createVerifiedUser(uniqueEmail("news-edit-admin"), "admin");
    const adminToken = await loginAs(app, admin.email);

    const createRes = await request(app)
      .post("/api/v1/admin/news")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Original", body: "Original body" });
    await request(app)
      .post(`/api/v1/admin/news/${createRes.body.id}/publish`)
      .set("Authorization", `Bearer ${adminToken}`);

    const editRes = await request(app)
      .patch(`/api/v1/admin/news/${createRes.body.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Updated title" });
    expect(editRes.status).toBe(200);
    expect(editRes.body.title).toBe("Updated title");
    expect(editRes.body.status).toBe("published");
  });
});

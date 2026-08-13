import { NotFoundError } from "../../lib/http-errors.js";
import { newsRepository, type NewsRepository } from "./repository.js";

export class NewsService {
  constructor(private readonly repo: NewsRepository) {}

  create(authorId: string, title: string, body: string, coverMediaAssetId?: string) {
    return this.repo.create({ authorId, title, body, coverMediaAssetId, status: "draft" });
  }

  async update(id: string, data: { title?: string; body?: string; coverMediaAssetId?: string }) {
    const updated = await this.repo.update(id, data);
    if (!updated) throw new NotFoundError("News post not found");
    return updated;
  }

  async publish(id: string) {
    const updated = await this.repo.update(id, { status: "published", publishedAt: new Date() });
    if (!updated) throw new NotFoundError("News post not found");
    return updated;
  }

  async unpublish(id: string) {
    const updated = await this.repo.update(id, { status: "draft", publishedAt: null });
    if (!updated) throw new NotFoundError("News post not found");
    return updated;
  }

  async delete(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError("News post not found");
    await this.repo.delete(id);
  }

  listAllForAdmin() {
    return this.repo.listAllForAdmin();
  }

  listPublished() {
    return this.repo.listPublished();
  }

  async getPublished(id: string) {
    const post = await this.repo.findById(id);
    if (!post || post.status !== "published") throw new NotFoundError("News post not found");
    return post;
  }
}

export const newsService = new NewsService(newsRepository);

import { eq, and, desc, isNotNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import { newsPosts } from "./schema.js";

export type NewsPostRow = typeof newsPosts.$inferSelect;
export type NewNewsPost = typeof newsPosts.$inferInsert;

export class NewsRepository {
  async create(data: NewNewsPost): Promise<NewsPostRow> {
    const [row] = await db.insert(newsPosts).values(data).returning();
    if (!row) throw new Error("failed to create news post");
    return row;
  }

  findById(id: string) {
    return db.query.newsPosts.findFirst({ where: eq(newsPosts.id, id) });
  }

  async update(id: string, data: Partial<NewNewsPost>): Promise<NewsPostRow | undefined> {
    const [row] = await db
      .update(newsPosts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(newsPosts.id, id))
      .returning();
    return row;
  }

  async delete(id: string): Promise<void> {
    await db.delete(newsPosts).where(eq(newsPosts.id, id));
  }

  listPublished() {
    return db.query.newsPosts.findMany({
      where: and(eq(newsPosts.status, "published"), isNotNull(newsPosts.publishedAt)),
      orderBy: [desc(newsPosts.publishedAt)],
    });
  }

  listAllForAdmin() {
    return db.query.newsPosts.findMany({ orderBy: [desc(newsPosts.createdAt)] });
  }
}

export const newsRepository = new NewsRepository();

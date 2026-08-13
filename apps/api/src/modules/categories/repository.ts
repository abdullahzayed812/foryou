import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { categories } from "./schema.js";

export type CategoryRow = typeof categories.$inferSelect;

export class CategoriesRepository {
  findAll() {
    return db.query.categories.findMany({ orderBy: [categories.nameEn] });
  }

  findById(id: string) {
    return db.query.categories.findFirst({ where: eq(categories.id, id) });
  }

  findBySlug(slug: string) {
    return db.query.categories.findFirst({ where: eq(categories.slug, slug) });
  }

  async create(data: typeof categories.$inferInsert): Promise<CategoryRow> {
    const [row] = await db.insert(categories).values(data).returning();
    if (!row) throw new Error("failed to create category");
    return row;
  }

  async update(
    id: string,
    data: Partial<typeof categories.$inferInsert>,
  ): Promise<CategoryRow | undefined> {
    const [row] = await db
      .update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return row;
  }

  async delete(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }
}

export const categoriesRepository = new CategoriesRepository();

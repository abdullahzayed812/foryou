import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { brands } from "./schema.js";

export type BrandRow = typeof brands.$inferSelect;

export class BrandsRepository {
  findAll() {
    return db.query.brands.findMany({ orderBy: [brands.name] });
  }

  findById(id: string) {
    return db.query.brands.findFirst({ where: eq(brands.id, id) });
  }

  findBySlug(slug: string) {
    return db.query.brands.findFirst({ where: eq(brands.slug, slug) });
  }

  async create(data: typeof brands.$inferInsert): Promise<BrandRow> {
    const [row] = await db.insert(brands).values(data).returning();
    if (!row) throw new Error("failed to create brand");
    return row;
  }

  async update(
    id: string,
    data: Partial<typeof brands.$inferInsert>,
  ): Promise<BrandRow | undefined> {
    const [row] = await db
      .update(brands)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(brands.id, id))
      .returning();
    return row;
  }

  async delete(id: string): Promise<void> {
    await db.delete(brands).where(eq(brands.id, id));
  }
}

export const brandsRepository = new BrandsRepository();

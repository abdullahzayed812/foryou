import { eq, and, gte, lte, asc, desc, sql, type SQL } from "drizzle-orm";
import { db } from "../../db/index.js";
import { products, productImages, productTags, stockNotifications } from "./schema.js";
import type { ListProductsQuery } from "@foryou/shared";
import { brands } from "../brands/schema.js";

export type ProductRow = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductImageInput = {
  mediaAssetId: string;
  isCover: boolean;
  isCountryOfOrigin: boolean;
};

// A transaction handle exposes the same query surface as `db` but isn't the
// same TS type (no `$client`) — this is Drizzle's documented shape for a
// helper that must run either standalone or inside an existing transaction.
type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export class ProductsRepository {
  async create(data: NewProduct, images: ProductImageInput[], tags: string[]): Promise<ProductRow> {
    return db.transaction(async (tx) => {
      const [row] = await tx.insert(products).values(data).returning();
      if (!row) throw new Error("failed to create product");
      if (images.length > 0) {
        await tx
          .insert(productImages)
          .values(images.map((img, position) => ({ productId: row.id, position, ...img })));
      }
      if (tags.length > 0) {
        await tx.insert(productTags).values(tags.map((tag) => ({ productId: row.id, tag })));
      }
      await this.refreshSearchVector(row.id, tx);
      return row;
    });
  }

  findById(id: string) {
    return db.query.products.findFirst({
      where: eq(products.id, id),
      with: {
        images: { orderBy: [productImages.position], with: { mediaAsset: true } },
        tags: true,
        category: true,
        brand: true,
      },
    });
  }

  async update(id: string, data: Partial<NewProduct>): Promise<ProductRow | undefined> {
    const [row] = await db
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    if (row) await this.refreshSearchVector(id);
    return row;
  }

  async replaceImages(productId: string, images: ProductImageInput[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(productImages).where(eq(productImages.productId, productId));
      await tx
        .insert(productImages)
        .values(images.map((img, position) => ({ productId, position, ...img })));
    });
  }

  async replaceTags(productId: string, tags: string[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(productTags).where(eq(productTags.productId, productId));
      if (tags.length > 0) {
        await tx.insert(productTags).values(tags.map((tag) => ({ productId, tag })));
      }
      await this.refreshSearchVector(productId, tx);
    });
  }

  async delete(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  /** Recomputes the FTS index from the product's own text fields + tags — 'simple' config, not language-stemmed (mixed AR/EN content). */
  async refreshSearchVector(productId: string, tx: DbOrTx = db): Promise<void> {
    await tx.execute(sql`
      update products set search_vector = (
        select to_tsvector('simple',
          coalesce(products.name, '') || ' ' ||
          coalesce(products.short_description, '') || ' ' ||
          coalesce(products.country_of_origin, '') || ' ' ||
          coalesce(string_agg(product_tags.tag, ' '), '')
        )
        from products
        left join product_tags on product_tags.product_id = products.id
        where products.id = ${productId}
        group by products.id
      )
      where products.id = ${productId}
    `);
  }

  async listOwnedBy(ownerId: string, ownerRole: "seller" | "merchant") {
    return db.query.products.findMany({
      where: and(eq(products.ownerId, ownerId), eq(products.ownerRole, ownerRole)),
      with: {
        images: { orderBy: [productImages.position], with: { mediaAsset: true } },
        tags: true,
        category: true,
        brand: true,
      },
      orderBy: [desc(products.createdAt)],
    });
  }

  async listForModerationQueue() {
    return db.query.products.findMany({
      where: eq(products.moderationStatus, "pending_review"),
      with: {
        images: { orderBy: [productImages.position], with: { mediaAsset: true } },
        tags: true,
        category: true,
        brand: true,
      },
      orderBy: [asc(products.createdAt)],
    });
  }

  /** Public browse — only ever returns published products, filtered/sorted per the BRD's Rule 6/7 options. */
  async browse(query: ListProductsQuery) {
    const conditions: SQL[] = [eq(products.moderationStatus, "published")];

    if (query.categoryId) conditions.push(eq(products.categoryId, query.categoryId));
    if (query.status) conditions.push(eq(products.status, query.status));
    if (query.priceMin !== undefined)
      conditions.push(gte(products.price, query.priceMin.toFixed(2)));
    if (query.priceMax !== undefined)
      conditions.push(lte(products.price, query.priceMax.toFixed(2)));
    if (query.q) {
      conditions.push(sql`${products.searchVector} @@ websearch_to_tsquery('simple', ${query.q})`);
    }
    if (query.brandSlug) {
      const brand = await db.query.brands.findFirst({ where: eq(brands.slug, query.brandSlug) });
      conditions.push(eq(products.brandId, brand?.id ?? "00000000-0000-0000-0000-000000000000"));
    }
    if (query.cursor) {
      conditions.push(sql`${products.createdAt} < ${query.cursor}`);
    }

    const orderBy =
      query.sort === "lowest_price"
        ? [asc(products.price)]
        : query.sort === "highest_price"
          ? [desc(products.price)]
          : // "best_selling"/"highest_rated" need Orders/Reviews (Phases 8–9); newest is the
            // honest default until that data exists, rather than faking a ranking now.
            [desc(products.createdAt)];

    const items = await db.query.products.findMany({
      where: and(...conditions),
      with: {
        images: { orderBy: [productImages.position], with: { mediaAsset: true } },
        tags: true,
        category: true,
        brand: true,
      },
      orderBy,
      limit: query.limit + 1,
    });

    const hasMore = items.length > query.limit;
    const page = hasMore ? items.slice(0, query.limit) : items;
    const last = page.at(-1);
    return { items: page, nextCursor: hasMore && last ? last.createdAt.toISOString() : null };
  }

  // ---- stock notifications ("Notify Me") ----

  async subscribeStockNotification(productId: string, customerId: string): Promise<void> {
    await db.insert(stockNotifications).values({ productId, customerId }).onConflictDoNothing();
  }

  async listStockSubscribers(productId: string): Promise<string[]> {
    const rows = await db.query.stockNotifications.findMany({
      where: eq(stockNotifications.productId, productId),
    });
    return rows.map((r) => r.customerId);
  }

  async clearStockNotifications(productId: string): Promise<void> {
    await db.delete(stockNotifications).where(eq(stockNotifications.productId, productId));
  }
}

export const productsRepository = new ProductsRepository();

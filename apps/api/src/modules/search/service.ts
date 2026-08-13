import { sql, ilike, or } from "drizzle-orm";
import { db } from "../../db/index.js";
import { redis } from "../../lib/redis.js";
import { products } from "../products/schema.js";
import { brands } from "../brands/schema.js";
import { categories } from "../categories/schema.js";
import { productsRepository } from "../products/repository.js";
import { withImageUrls } from "../products/service.js";
import type { ListProductsQuery } from "@foryou/shared";

const SUGGEST_CACHE_TTL_SECONDS = 60 * 5;
const SUGGEST_LIMIT = 8;

export class SearchService {
  /** GET /search — products via full-text search, plus matching brands/categories so the UI can deep-link. */
  async search(query: ListProductsQuery) {
    const [productResults, matchingBrands, matchingCategories] = await Promise.all([
      productsRepository.browse(query),
      query.q ? this.matchBrands(query.q) : Promise.resolve([]),
      query.q ? this.matchCategories(query.q) : Promise.resolve([]),
    ]);

    return {
      products: productResults.items.map(withImageUrls),
      nextCursor: productResults.nextCursor,
      brands: matchingBrands,
      categories: matchingCategories,
    };
  }

  private matchBrands(q: string) {
    return db.query.brands.findMany({ where: ilike(brands.name, `%${q}%`), limit: 5 });
  }

  private matchCategories(q: string) {
    return db.query.categories.findMany({
      where: or(ilike(categories.nameEn, `%${q}%`), ilike(categories.nameAr, `%${q}%`)),
      limit: 5,
    });
  }

  /**
   * Prefix autocomplete over product names + brand names, Redis-cached
   * (architecture doc §08 `ac:{lang}:{prefix}`) since it's hit on every
   * keystroke. TTL-only invalidation for now — a short 5-minute window is a
   * fine tradeoff against a stale suggestion, versus invalidating on every
   * product write for a cache this cheap to regenerate.
   */
  async suggest(q: string): Promise<string[]> {
    const prefix = q.trim().toLowerCase();
    if (prefix.length < 2) return [];

    const cacheKey = `ac:${prefix}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as string[];

    const [productNames, brandNames] = await Promise.all([
      db
        .selectDistinct({ name: products.name })
        .from(products)
        .where(
          sql`${products.moderationStatus} = 'published' and ${ilike(products.name, `${prefix}%`)}`,
        )
        .limit(SUGGEST_LIMIT),
      db
        .selectDistinct({ name: brands.name })
        .from(brands)
        .where(ilike(brands.name, `${prefix}%`))
        .limit(SUGGEST_LIMIT),
    ]);

    const suggestions = [
      ...new Set([...productNames.map((p) => p.name), ...brandNames.map((b) => b.name)]),
    ].slice(0, SUGGEST_LIMIT);

    await redis.set(cacheKey, JSON.stringify(suggestions), "EX", SUGGEST_CACHE_TTL_SECONDS);
    return suggestions;
  }
}

export const searchService = new SearchService();

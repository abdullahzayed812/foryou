import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { wishlistItems } from "./schema.js";
import { productImages } from "../products/schema.js";

export class WishlistRepository {
  async add(customerId: string, productId: string): Promise<void> {
    await db.insert(wishlistItems).values({ customerId, productId }).onConflictDoNothing();
  }

  async remove(customerId: string, productId: string): Promise<void> {
    await db
      .delete(wishlistItems)
      .where(and(eq(wishlistItems.customerId, customerId), eq(wishlistItems.productId, productId)));
  }

  /**
   * `with: { product: true }` alone only pulls the bare product row — the
   * frontend's `Product` type (same shape as the catalog endpoints) expects
   * `images`/`tags`/`category`/`brand` too, so this mirrors the same nested
   * `with` products/repository.ts uses everywhere else.
   */
  list(customerId: string) {
    return db.query.wishlistItems.findMany({
      where: eq(wishlistItems.customerId, customerId),
      with: {
        product: {
          with: {
            images: { orderBy: [productImages.position], with: { mediaAsset: true } },
            tags: true,
            category: true,
            brand: true,
          },
        },
      },
      orderBy: [desc(wishlistItems.createdAt)],
    });
  }
}

export const wishlistRepository = new WishlistRepository();

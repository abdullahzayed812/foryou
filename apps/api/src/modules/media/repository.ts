import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { mediaAssets } from "./schema.js";

export type MediaAssetRow = typeof mediaAssets.$inferSelect;
export type NewMediaAsset = typeof mediaAssets.$inferInsert;

export class MediaRepository {
  async create(data: NewMediaAsset): Promise<MediaAssetRow> {
    const [row] = await db.insert(mediaAssets).values(data).returning();
    if (!row) throw new Error("failed to create media asset");
    return row;
  }

  findById(id: string) {
    return db.query.mediaAssets.findFirst({ where: eq(mediaAssets.id, id) });
  }

  async setStatus(id: string, status: MediaAssetRow["status"]): Promise<void> {
    await db
      .update(mediaAssets)
      .set({ status, updatedAt: new Date() })
      .where(eq(mediaAssets.id, id));
  }

  async markReady(
    id: string,
    data: { processedKey: string; width?: number; height?: number },
  ): Promise<void> {
    await db
      .update(mediaAssets)
      .set({ status: "ready", updatedAt: new Date(), ...data })
      .where(eq(mediaAssets.id, id));
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await db
      .update(mediaAssets)
      .set({ status: "failed", errorMessage, updatedAt: new Date() })
      .where(eq(mediaAssets.id, id));
  }

  async delete(id: string): Promise<void> {
    await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
  }
}

export const mediaRepository = new MediaRepository();

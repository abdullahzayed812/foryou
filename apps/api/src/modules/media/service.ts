import { randomUUID } from "node:crypto";
import type { SignUploadInput } from "@foryou/shared";
import { env } from "../../config/env.js";
import { putObjectBuffer, deleteObject } from "../../lib/s3.js";
import { NotFoundError, ForbiddenError, ConflictError } from "../../lib/http-errors.js";
import { mediaRepository, type MediaRepository, type MediaAssetRow } from "./repository.js";
import { enqueueMediaProcessing } from "./queue.js";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

export interface SignedUploadResult {
  assetId: string;
  key: string;
}

export class MediaService {
  constructor(private readonly repo: MediaRepository) {}

  async createSignedUpload(
    uploaderId: string,
    input: SignUploadInput,
  ): Promise<SignedUploadResult> {
    const assetId = randomUUID();
    const ext = EXT_BY_MIME[input.mimeType] ?? "bin";
    const key = `uploads/${assetId}/original.${ext}`;

    await this.repo.create({
      id: assetId,
      uploaderId,
      kind: input.kind,
      purpose: input.purpose,
      status: "pending",
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      originalKey: key,
    });

    return { assetId, key };
  }

  /**
   * The browser PUTs its file bytes here instead of directly to R2 — the API
   * already holds working R2 credentials (verified independently), so this
   * avoids depending on the bucket's CORS configuration ever being set up
   * correctly for direct browser-to-bucket uploads, and gets real
   * `requireAuth` + ownership checks instead of relying purely on a signed
   * URL's built-in expiry.
   */
  async uploadOriginal(
    assetId: string,
    uploaderId: string,
    body: Buffer,
    contentType: string,
  ): Promise<MediaAssetRow> {
    const asset = await this.repo.findById(assetId);
    if (!asset) throw new NotFoundError("Upload not found");
    if (asset.uploaderId !== uploaderId) throw new ForbiddenError();
    if (asset.status !== "pending")
      throw new ConflictError("This upload has already been completed");

    await putObjectBuffer(asset.originalKey, body, contentType || asset.mimeType);
    return asset;
  }

  async completeUpload(assetId: string, uploaderId: string): Promise<MediaAssetRow> {
    const asset = await this.repo.findById(assetId);
    if (!asset) throw new NotFoundError("Upload not found");
    if (asset.uploaderId !== uploaderId) throw new ForbiddenError();
    if (asset.status !== "pending")
      throw new ConflictError("This upload has already been completed");

    await this.repo.setStatus(assetId, "processing");
    await enqueueMediaProcessing(assetId);
    const updated = await this.repo.findById(assetId);
    if (!updated) throw new NotFoundError("Upload not found");
    return updated;
  }

  /** Deletes both the R2 object(s) and the asset row — only the uploader (or
   * an admin) may do this, and only before it's attached anywhere permanent
   * (callers that reference a media asset, e.g. product images, delete their
   * own join row first and never call this on an asset still in use). */
  async deleteAsset(assetId: string, requesterId: string, isAdmin: boolean): Promise<void> {
    const asset = await this.repo.findById(assetId);
    if (!asset) throw new NotFoundError("Media asset not found");
    if (asset.uploaderId !== requesterId && !isAdmin) throw new ForbiddenError();

    await deleteObject(asset.originalKey);
    if (asset.processedKey) await deleteObject(asset.processedKey);
    await this.repo.delete(assetId);
  }

  /** Only the uploader (or an admin) may read an asset — uploads include sensitive verification documents. */
  async getAsset(assetId: string, requesterId: string, isAdmin: boolean): Promise<MediaAssetRow> {
    const asset = await this.repo.findById(assetId);
    if (!asset) throw new NotFoundError("Media asset not found");
    if (asset.uploaderId !== requesterId && !isAdmin) throw new ForbiddenError();
    return asset;
  }

  /** Ready assets are served from the public bucket URL directly — no signed GET needed (architecture doc §01). */
  publicUrlFor(key: string): string {
    return `${env.MEDIA_PUBLIC_BASE_URL}/${key}`;
  }
}

export const mediaService = new MediaService(mediaRepository);

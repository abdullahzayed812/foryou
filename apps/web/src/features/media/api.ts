import { apiClient } from "@/lib/api-client";

export type MediaPurpose =
  | "verification_document"
  | "product_image"
  | "product_video"
  | "review_evidence"
  | "dispute_evidence";

interface SignUploadResponse {
  assetId: string;
  key: string;
}

export interface MediaAsset {
  id: string;
  status: "pending" | "processing" | "ready" | "failed";
  url?: string;
}

export const mediaApi = {
  sign: (input: {
    kind: "image" | "video";
    mimeType: string;
    sizeBytes: number;
    purpose: MediaPurpose;
  }) => apiClient.post<SignUploadResponse>("/media/uploads/sign", input).then((r) => r.data),

  // The browser PUTs its file straight to our own API (same origin as every
  // other call here, so no bucket CORS policy is needed), which forwards it
  // to R2 server-side — see the backend media module's `uploadOriginal`.
  upload: (assetId: string, file: File) =>
    apiClient.put(`/media/uploads/${assetId}/upload`, file, {
      headers: { "Content-Type": file.type },
    }),

  complete: (assetId: string) =>
    apiClient.post(`/media/uploads/${assetId}/complete`).then((r) => r.data),

  get: (assetId: string) =>
    apiClient.get<MediaAsset>(`/media/uploads/${assetId}`).then((r) => r.data),

  /** Only valid for an asset not yet attached anywhere (e.g. a staged upload
   * the user removed before saving) — the backend rejects deleting one still
   * referenced by a product/review/etc. */
  remove: (assetId: string) => apiClient.delete(`/media/uploads/${assetId}`),
};

const POLL_INTERVAL_MS = 700;
const MAX_POLLS = 25;

/** Signs, uploads, completes, and polls a single file to `ready` — returns its asset id. */
export async function uploadMediaAsset(
  file: File,
  purpose: MediaPurpose,
  kind: "image" | "video" = "image",
): Promise<string> {
  const sign = await mediaApi.sign({ kind, mimeType: file.type, sizeBytes: file.size, purpose });
  await mediaApi.upload(sign.assetId, file);
  await mediaApi.complete(sign.assetId);

  for (let i = 0; i < MAX_POLLS; i++) {
    const asset = await mediaApi.get(sign.assetId);
    if (asset.status === "ready") return sign.assetId;
    if (asset.status === "failed") throw new Error("Media processing failed");
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error("Media processing timed out");
}

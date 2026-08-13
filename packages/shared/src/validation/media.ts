import { z } from "zod";

// BRD NFR "Media Upload Limits": images max 10 MB, videos max 100 MB.
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ALLOWED_VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;

// Not a foreign key to any owning record (nothing may exist yet at upload
// time — e.g. a verification request is created *after* its documents are
// uploaded) — just a hint the processing worker uses to decide behavior like
// whether to apply the FOR YOU watermark (product images only, per BRD Rule 6;
// verification documents must NOT be watermarked).
export const MEDIA_PURPOSES = [
  "verification_document",
  "product_image",
  "product_video",
  "review_evidence",
  "dispute_evidence",
] as const;
export type MediaPurpose = (typeof MEDIA_PURPOSES)[number];

export const signUploadSchema = z
  .object({
    kind: z.enum(["image", "video"]),
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().positive(),
    purpose: z.enum(MEDIA_PURPOSES),
  })
  .strict()
  .refine(
    (v) => (v.kind === "image" ? ALLOWED_IMAGE_MIME_TYPES.includes(v.mimeType as never) : true),
    { message: "Unsupported image type — use JPEG, PNG or WebP", path: ["mimeType"] },
  )
  .refine(
    (v) => (v.kind === "video" ? ALLOWED_VIDEO_MIME_TYPES.includes(v.mimeType as never) : true),
    { message: "Unsupported video type — use MP4, MOV or WebM", path: ["mimeType"] },
  )
  .refine((v) => (v.kind === "image" ? v.sizeBytes <= MAX_IMAGE_BYTES : true), {
    message: "Images must be 10 MB or smaller",
    path: ["sizeBytes"],
  })
  .refine((v) => (v.kind === "video" ? v.sizeBytes <= MAX_VIDEO_BYTES : true), {
    message: "Videos must be 100 MB or smaller",
    path: ["sizeBytes"],
  });
export type SignUploadInput = z.infer<typeof signUploadSchema>;

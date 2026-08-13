import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";

/**
 * Cloudflare R2 in production; MinIO (docker-compose.dev.yml) in dev — both
 * are S3-API-compatible, so one client works for both (architecture doc §01
 * Storage, §12). `forcePathStyle` is required for MinIO and harmless on R2.
 */
export const s3Client = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials:
    env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
      ? { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY }
      : undefined,
});

export const MEDIA_BUCKET = env.S3_BUCKET;

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const res = await s3Client.send(new GetObjectCommand({ Bucket: MEDIA_BUCKET, Key: key }));
  const bytes = await res.Body?.transformToByteArray();
  if (!bytes) throw new Error(`Object body empty for key ${key}`);
  return Buffer.from(bytes);
}

export async function putObjectBuffer(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({ Bucket: MEDIA_BUCKET, Key: key, Body: body, ContentType: contentType }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  await s3Client.send(new DeleteObjectCommand({ Bucket: MEDIA_BUCKET, Key: key }));
}

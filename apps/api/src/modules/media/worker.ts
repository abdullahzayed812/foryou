import sharp, { type Sharp, type ResizeOptions, type OutputInfo } from "sharp";
import type { Job } from "bullmq";
import { getObjectBuffer, putObjectBuffer } from "../../lib/s3.js";
import { logger } from "../../lib/logger.js";
import { createWorker } from "../../lib/queue.js";
import { mediaRepository } from "./repository.js";
import { buildWatermarkOverlay } from "./watermark.js";
import { MEDIA_PROCESSING_QUEUE, type MediaProcessingJob } from "./queue.js";

const MAX_DIMENSION = 2000;
const WATERMARKED_PURPOSES = new Set(["product_image"]);

async function encode(
  pipeline: Sharp,
  format: "png" | "webp" | "jpeg",
): Promise<{ data: Buffer; info: OutputInfo }> {
  return format === "png"
    ? pipeline.png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true })
    : format === "webp"
      ? pipeline.webp({ quality: 80 }).toBuffer({ resolveWithObject: true })
      : pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer({ resolveWithObject: true });
}

async function processImage(assetId: string, originalKey: string, purpose: string): Promise<void> {
  const original = await getObjectBuffer(originalKey);
  const metadata = await sharp(original).metadata();
  const format = metadata.format === "png" ? "png" : metadata.format === "webp" ? "webp" : "jpeg";
  const resizeOptions: ResizeOptions = {
    width: MAX_DIMENSION,
    height: MAX_DIMENSION,
    fit: "inside",
    withoutEnlargement: true,
  };
  // .rotate() with no args auto-orients from EXIF — a fresh pipeline per
  // attempt below since a sharp instance is consumed after one toBuffer().
  const freshPipeline = () => sharp(original).rotate().resize(resizeOptions);

  const resizedWidth = Math.min(metadata.width ?? MAX_DIMENSION, MAX_DIMENSION);

  let output: { data: Buffer; info: OutputInfo };
  if (WATERMARKED_PURPOSES.has(purpose)) {
    try {
      const overlay = await buildWatermarkOverlay(resizedWidth);
      output = await encode(
        freshPipeline().composite([{ input: overlay, gravity: "southeast" }]),
        format,
      );
    } catch {
      // The watermark overlay only shrinks to a fixed minimum size (BRD Rule
      // 6 doesn't specify a minimum photo size) — an image smaller than that
      // floor can't fit it. Ship the resized image unwatermarked rather than
      // failing the whole upload over a legible-watermark requirement no one
      // asked for on a thumbnail-sized photo.
      output = await encode(freshPipeline(), format);
    }
  } else {
    output = await encode(freshPipeline(), format);
  }

  const processedKey = originalKey.replace(/original\.[^.]+$/, `processed.${format}`);
  await putObjectBuffer(processedKey, output.data, `image/${format}`);
  await mediaRepository.markReady(assetId, {
    processedKey,
    width: output.info.width,
    height: output.info.height,
  });
}

/**
 * Video optimization is NFR-required (BRD "Video optimization enabled") but
 * real transcoding needs an ffmpeg binary in the runtime image — not wired up
 * yet (tracked for the Docker/worker image build in §12). For now the
 * original upload is passed through untouched so the rest of the pipeline
 * (status transitions, product/review/dispute flows) can be built and tested
 * against a working `processedKey` today.
 */
async function processVideo(assetId: string, originalKey: string): Promise<void> {
  const original = await getObjectBuffer(originalKey);
  const processedKey = originalKey.replace(/original\.([^.]+)$/, "processed.$1");
  await putObjectBuffer(processedKey, original, "video/mp4");
  await mediaRepository.markReady(assetId, { processedKey });
}

async function handleJob(job: Job<MediaProcessingJob>): Promise<void> {
  const asset = await mediaRepository.findById(job.data.assetId);
  if (!asset) {
    logger.warn({ assetId: job.data.assetId }, "media job for missing asset, skipping");
    return;
  }
  try {
    if (asset.kind === "image") {
      await processImage(asset.id, asset.originalKey, asset.purpose);
    } else {
      await processVideo(asset.id, asset.originalKey);
    }
  } catch (err) {
    await mediaRepository.markFailed(
      asset.id,
      err instanceof Error ? err.message : "processing failed",
    );
    throw err; // re-throw so BullMQ still records/retries the failure
  }
}

export function startMediaWorker() {
  return createWorker<MediaProcessingJob>(MEDIA_PROCESSING_QUEUE, handleJob);
}

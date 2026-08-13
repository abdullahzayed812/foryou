import { createQueue } from "../../lib/queue.js";

export interface MediaProcessingJob {
  assetId: string;
}

export const MEDIA_PROCESSING_QUEUE = "media-processing";

export const mediaProcessingQueue = createQueue<MediaProcessingJob>(MEDIA_PROCESSING_QUEUE);

export function enqueueMediaProcessing(assetId: string): Promise<unknown> {
  return mediaProcessingQueue.add(
    "process",
    { assetId },
    { attempts: 3, backoff: { type: "exponential", delay: 2000 } },
  );
}

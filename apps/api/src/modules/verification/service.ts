import type {
  SubmitIdentityVerificationInput,
  SubmitBusinessVerificationInput,
} from "@foryou/shared";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../lib/http-errors.js";
import { eventBus } from "../../lib/events.js";
import { mediaRepository, type MediaAssetRow } from "../media/repository.js";
import { mediaService } from "../media/service.js";
import { verificationRepository, type VerificationRepository } from "./repository.js";
import "./events.js";

async function requireReadyOwnedAsset(assetId: string, userId: string): Promise<MediaAssetRow> {
  const asset = await mediaRepository.findById(assetId);
  if (!asset) throw new NotFoundError(`Media asset ${assetId} not found`);
  if (asset.uploaderId !== userId) throw new ForbiddenError("You don't own this uploaded file");
  if (asset.status !== "ready")
    throw new ValidationError("Document is still processing — try again shortly");
  return asset;
}

export class VerificationService {
  constructor(private readonly repo: VerificationRepository) {}

  async submitIdentity(userId: string, input: SubmitIdentityVerificationInput) {
    const live = await this.repo.findLiveRequest(userId, "identity");
    if (live) throw new ConflictError("Identity verification is already pending review");

    await requireReadyOwnedAsset(input.nationalIdMediaAssetId, userId);
    await requireReadyOwnedAsset(input.selfieMediaAssetId, userId);

    const request = await this.repo.create({ userId, type: "identity" });
    await this.repo.addDocuments(request.id, [
      { mediaAssetId: input.nationalIdMediaAssetId, documentType: "national_id" },
      { mediaAssetId: input.selfieMediaAssetId, documentType: "selfie" },
    ]);
    eventBus.publish("verification.submitted", { requestId: request.id, userId, type: "identity" });
    return this.repo.findById(request.id);
  }

  async submitBusiness(userId: string, input: SubmitBusinessVerificationInput) {
    const live = await this.repo.findLiveRequest(userId, "business");
    if (live) throw new ConflictError("Business verification is already pending review");

    await requireReadyOwnedAsset(input.commercialRegistrationMediaAssetId, userId);

    const request = await this.repo.create({ userId, type: "business" });
    await this.repo.addDocuments(request.id, [
      {
        mediaAssetId: input.commercialRegistrationMediaAssetId,
        documentType: "commercial_registration",
      },
    ]);
    eventBus.publish("verification.submitted", { requestId: request.id, userId, type: "business" });
    return this.repo.findById(request.id);
  }

  /** Add documents to a request an admin flagged "more_docs_needed" — same request, back into the queue. */
  async addMoreDocuments(
    userId: string,
    requestId: string,
    documents: {
      mediaAssetId: string;
      documentType: "national_id" | "selfie" | "commercial_registration";
    }[],
  ) {
    const request = await this.repo.findById(requestId);
    if (!request || request.userId !== userId)
      throw new NotFoundError("Verification request not found");
    if (request.status !== "more_docs_needed") {
      throw new ConflictError("This request isn't awaiting additional documents");
    }
    for (const doc of documents) {
      await requireReadyOwnedAsset(doc.mediaAssetId, userId);
    }
    await this.repo.addDocuments(requestId, documents);
    const updated = await this.repo.setStatus(requestId, "pending");
    eventBus.publish("verification.submitted", { requestId, userId, type: updated.type });
    return this.repo.findById(requestId);
  }

  async getMine(userId: string) {
    return this.repo.latestForUser(userId);
  }

  /**
   * Used by Products' moderation gate (BRD Rule 6: verified accounts
   * auto-publish, unverified accounts stay pending). "Verified" means either
   * identity or business verification has been approved — a Seller typically
   * has identity approved, a Merchant may rely on business verification
   * instead; either is enough to count as trusted.
   */
  async isAccountVerified(userId: string): Promise<boolean> {
    const [identity, business] = await Promise.all([
      this.repo.findApprovedRequest(userId, "identity"),
      this.repo.findApprovedRequest(userId, "business"),
    ]);
    return Boolean(identity || business);
  }

  // ------------------------------------------------------------- admin

  /** Resolves each document's underlying media asset to a viewable URL so
   * admins can see the actual submitted image, not just its document type. */
  async getQueue() {
    const requests = await this.repo.queue("pending");
    return Promise.all(
      requests.map(async (request) => ({
        ...request,
        documents: await Promise.all(
          request.documents.map(async (doc) => {
            const asset = await mediaRepository.findById(doc.mediaAssetId);
            const url =
              asset && asset.status === "ready"
                ? mediaService.publicUrlFor(asset.processedKey ?? asset.originalKey)
                : null;
            return { ...doc, url };
          }),
        ),
      })),
    );
  }

  async approve(adminId: string, requestId: string) {
    const request = await this.repo.findById(requestId);
    if (!request) throw new NotFoundError("Verification request not found");
    const updated = await this.repo.setStatus(requestId, "approved", { reviewedBy: adminId });
    eventBus.publish("verification.approved", {
      requestId,
      userId: request.userId,
      type: request.type,
    });
    return updated;
  }

  async reject(adminId: string, requestId: string, reason: string) {
    const request = await this.repo.findById(requestId);
    if (!request) throw new NotFoundError("Verification request not found");
    const updated = await this.repo.setStatus(requestId, "rejected", {
      reviewedBy: adminId,
      rejectionReason: reason,
    });
    eventBus.publish("verification.rejected", {
      requestId,
      userId: request.userId,
      type: request.type,
      reason,
    });
    return updated;
  }

  async requestMoreDocs(adminId: string, requestId: string, message: string) {
    const request = await this.repo.findById(requestId);
    if (!request) throw new NotFoundError("Verification request not found");
    return this.repo.setStatus(requestId, "more_docs_needed", {
      reviewedBy: adminId,
      rejectionReason: message,
    });
  }

  /** Admin-triggered revoke for fraud/expired-docs (BRD Rule 9 "Removing Verification" / "Expired Documents"). */
  async revoke(adminId: string, userId: string, type: "identity" | "business", reason: string) {
    const approved = await this.repo.findApprovedRequest(userId, type);
    if (!approved) throw new NotFoundError("No approved verification of this type to revoke");
    const updated = await this.repo.setStatus(approved.id, "revoked", {
      reviewedBy: adminId,
      rejectionReason: reason,
    });
    eventBus.publish("verification.revoked", { userId, type, reason });
    return updated;
  }
}

export const verificationService = new VerificationService(verificationRepository);

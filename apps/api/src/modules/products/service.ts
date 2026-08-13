import {
  deriveProductStatus,
  type CreateProductInput,
  type UpdateProductInput,
  type ListProductsQuery,
} from "@foryou/shared";
import { ForbiddenError, NotFoundError, ValidationError } from "../../lib/http-errors.js";
import { eventBus } from "../../lib/events.js";
import { mediaRepository } from "../media/repository.js";
import { mediaService } from "../media/service.js";
import { verificationService } from "../verification/service.js";
import {
  productsRepository,
  type ProductsRepository,
  type ProductImageInput,
} from "./repository.js";
import "./events.js";

export interface ImageWithMediaAsset {
  mediaAsset?: { processedKey: string | null; originalKey: string } | null;
}

/**
 * The browse/detail/owner queries join each image's media asset (schema.ts
 * productImagesRelations) purely so this can attach a directly-usable `url`
 * — otherwise the frontend would need one GET /media/uploads/:id round trip
 * per image just to render a product grid. The joined `mediaAsset` itself
 * is dropped from the response — it carries internal fields (uploaderId,
 * storage keys, byte size) that have no business being on a public endpoint.
 */
function withImageUrl<T extends ImageWithMediaAsset>(
  image: T,
): Omit<T, "mediaAsset"> & { url: string | null } {
  const { mediaAsset, ...rest } = image;
  return {
    ...rest,
    url: mediaAsset
      ? mediaService.publicUrlFor(mediaAsset.processedKey ?? mediaAsset.originalKey)
      : null,
  };
}

export function withImageUrls<T extends { images: ImageWithMediaAsset[] }>(product: T) {
  return { ...product, images: product.images.map(withImageUrl) };
}

async function validateOwnedReadyImages(
  images: { mediaAssetId: string }[],
  ownerId: string,
): Promise<void> {
  for (const img of images) {
    const asset = await mediaRepository.findById(img.mediaAssetId);
    if (!asset) throw new NotFoundError(`Media asset ${img.mediaAssetId} not found`);
    if (asset.uploaderId !== ownerId) throw new ForbiddenError("You don't own this uploaded file");
    if (asset.status !== "ready")
      throw new ValidationError("An image is still processing — try again shortly");
  }
}

export class ProductsService {
  constructor(private readonly repo: ProductsRepository) {}

  async create(ownerId: string, ownerRole: "seller" | "merchant", input: CreateProductInput) {
    await validateOwnedReadyImages(input.images, ownerId);
    if (input.videoMediaAssetId) {
      const video = await mediaRepository.findById(input.videoMediaAssetId);
      if (!video || video.uploaderId !== ownerId)
        throw new ForbiddenError("You don't own this uploaded video");
    }

    const verified = await verificationService.isAccountVerified(ownerId);
    const status = deriveProductStatus(input.availableQuantity, input.isComingSoon);

    const product = await this.repo.create(
      {
        ownerId,
        ownerRole,
        categoryId: input.categoryId,
        brandId: input.brandId,
        name: input.name,
        shortDescription: input.shortDescription,
        detailedDescription: input.detailedDescription,
        countryOfOrigin: input.countryOfOrigin,
        price: input.price.toFixed(2),
        shippingCost: input.shippingCost.toFixed(2),
        availableQuantity: input.availableQuantity,
        status,
        warrantyAvailable: input.warrantyAvailable,
        videoMediaAssetId: input.videoMediaAssetId,
        // Verified accounts publish immediately with random admin spot-checks;
        // unverified accounts stay pending until an admin reviews (BRD Rule 6).
        moderationStatus: verified ? "published" : "pending_review",
      },
      input.images as ProductImageInput[],
      input.tags,
    );

    eventBus.publish(verified ? "product.published" : "product.pending_review", {
      productId: product.id,
      ownerId,
    });
    const created = await this.repo.findById(product.id);
    return created && withImageUrls(created);
  }

  private async getOwned(productId: string, ownerId: string) {
    const product = await this.repo.findById(productId);
    if (!product) throw new NotFoundError("Product not found");
    if (product.ownerId !== ownerId) throw new ForbiddenError("You don't own this product");
    return product;
  }

  async update(ownerId: string, productId: string, input: UpdateProductInput) {
    const existing = await this.getOwned(productId, ownerId);

    const nextQuantity = input.availableQuantity ?? existing.availableQuantity;
    const nextComingSoon = input.isComingSoon ?? existing.status === "coming_soon";
    const status = deriveProductStatus(nextQuantity, nextComingSoon);

    const updated = await this.repo.update(productId, {
      ...input,
      price: input.price !== undefined ? input.price.toFixed(2) : undefined,
      shippingCost: input.shippingCost !== undefined ? input.shippingCost.toFixed(2) : undefined,
      status,
    });
    if (!updated) throw new NotFoundError("Product not found");

    if (input.tags) await this.repo.replaceTags(productId, input.tags);

    if (input.price !== undefined && input.price.toFixed(2) !== existing.price) {
      eventBus.publish("product.price_changed", {
        productId,
        oldPrice: existing.price,
        newPrice: input.price.toFixed(2),
      });
    }

    if (existing.status !== "out_of_stock" && status === "out_of_stock") {
      eventBus.publish("product.stock.depleted", { productId });
    }
    if (existing.status === "out_of_stock" && status !== "out_of_stock") {
      const subscriberIds = await this.repo.listStockSubscribers(productId);
      if (subscriberIds.length > 0) {
        eventBus.publish("product.stock.restocked", { productId, subscriberIds });
        await this.repo.clearStockNotifications(productId);
      }
    }

    const updatedProduct = await this.repo.findById(productId);
    return updatedProduct && withImageUrls(updatedProduct);
  }

  async replaceImages(ownerId: string, productId: string, images: ProductImageInput[]) {
    await this.getOwned(productId, ownerId);
    await validateOwnedReadyImages(images, ownerId);
    await this.repo.replaceImages(productId, images);
    const updated = await this.repo.findById(productId);
    return updated && withImageUrls(updated);
  }

  async delete(ownerId: string, productId: string) {
    await this.getOwned(productId, ownerId);
    // BRD Rule 6 "Product Deletion": products with active orders can't be
    // deleted until those orders complete. No guard yet — Orders doesn't
    // exist until Phase 8; this gets wired in then, not faked now.
    await this.repo.delete(productId);
  }

  async getPublic(productId: string) {
    const product = await this.repo.findById(productId);
    if (!product || product.moderationStatus !== "published")
      throw new NotFoundError("Product not found");
    return withImageUrls(product);
  }

  /** Owner can view their own product regardless of moderation status (e.g. to see a rejection reason). */
  async getForOwner(ownerId: string, productId: string) {
    const product = await this.getOwned(productId, ownerId);
    return withImageUrls(product);
  }

  async listOwnedBy(ownerId: string, ownerRole: "seller" | "merchant") {
    const items = await this.repo.listOwnedBy(ownerId, ownerRole);
    return items.map(withImageUrls);
  }

  async browse(query: ListProductsQuery) {
    const { items, nextCursor } = await this.repo.browse(query);
    return { items: items.map(withImageUrls), nextCursor };
  }

  async notifyMeWhenAvailable(productId: string, customerId: string) {
    const product = await this.repo.findById(productId);
    if (!product) throw new NotFoundError("Product not found");
    await this.repo.subscribeStockNotification(productId, customerId);
  }

  // ------------------------------------------------------------- admin

  async getModerationQueue() {
    const items = await this.repo.listForModerationQueue();
    return items.map(withImageUrls);
  }

  async approve(productId: string) {
    const updated = await this.repo.update(productId, {
      moderationStatus: "published",
      rejectionReason: null,
    });
    if (!updated) throw new NotFoundError("Product not found");
    eventBus.publish("product.published", { productId, ownerId: updated.ownerId });
    return updated;
  }

  async reject(productId: string, reason: string) {
    const updated = await this.repo.update(productId, {
      moderationStatus: "rejected",
      rejectionReason: reason,
    });
    if (!updated) throw new NotFoundError("Product not found");
    return updated;
  }

  async hide(productId: string) {
    const updated = await this.repo.update(productId, { moderationStatus: "hidden" });
    if (!updated) throw new NotFoundError("Product not found");
    return updated;
  }

  async adminDelete(productId: string) {
    const existing = await this.repo.findById(productId);
    if (!existing) throw new NotFoundError("Product not found");
    await this.repo.delete(productId);
  }
}

export const productsService = new ProductsService(productsRepository);

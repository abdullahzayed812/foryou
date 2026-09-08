import { deriveProductStatus } from "@foryou/shared";
import { ConflictError, ForbiddenError, NotFoundError } from "../../lib/http-errors.js";
import { eventBus } from "../../lib/events.js";
import { productsRepository } from "../products/repository.js";
import { wantedRepository, type WantedCycleRow, type WantedRepository } from "./repository.js";
import "./events.js";

export interface WantedCycleSummary {
  id: string;
  cycleNumber: number;
  status: WantedCycleRow["status"];
  likeCount: number;
  notifyCount: number;
  createdAt: Date;
}

export interface WantedView {
  lifecycle: "wanted" | "importing" | "express";
  /** The open cycle's live engagement, or null once the product is EXPRESS (WANTED counters become history, §6). */
  cycle: WantedCycleSummary | null;
  viewerLiked: boolean;
  viewerNotified: boolean;
}

export interface WantedCycleAnalytics {
  id: string;
  cycleNumber: number;
  status: WantedCycleRow["status"];
  likes: number;
  notifyRequests: number;
  importedQuantity: number | null;
  unitsSold: number | null;
  remainingStock: number | null;
  createdAt: Date;
  importingAt: Date | null;
  completedAt: Date | null;
  /**
   * Real notify→purchase conversion for a completed cycle: how many of this
   * cycle's 🔔 requesters later placed a paid EXPRESS order for this product
   * (§10 — computed only from actual order rows, matched by customer id).
   * null while the cycle is still open.
   */
  notifyToPurchase: { notified: number; purchased: number; rate: number } | null;
}

export class WantedService {
  constructor(private readonly repo: WantedRepository) {}

  private async getOwnedProduct(productId: string, ownerId: string) {
    const product = await productsRepository.findById(productId);
    if (!product) throw new NotFoundError("Product not found");
    if (product.ownerId !== ownerId) throw new ForbiddenError("You don't own this product");
    return product;
  }

  private summarize(cycle: WantedCycleRow, likeCount: number, notifyCount: number): WantedCycleSummary {
    return {
      id: cycle.id,
      cycleNumber: cycle.cycleNumber,
      status: cycle.status,
      likeCount,
      notifyCount,
      createdAt: cycle.createdAt,
    };
  }

  // ------------------------------------------------------ customer view

  async getView(productId: string, viewerId?: string): Promise<WantedView> {
    const product = await productsRepository.findById(productId);
    if (!product) throw new NotFoundError("Product not found");

    const open = await this.repo.findOpenCycle(productId);
    if (!open) {
      return {
        lifecycle: product.lifecycle,
        cycle: null,
        viewerLiked: false,
        viewerNotified: false,
      };
    }

    const [likes, notifies] = await Promise.all([
      this.repo.likeCounts([open.id]),
      this.repo.notifyCounts([open.id]),
    ]);
    const viewer = viewerId
      ? await this.repo.viewerState(open.id, viewerId)
      : { liked: false, notified: false };

    return {
      lifecycle: product.lifecycle,
      cycle: this.summarize(open, likes.get(open.id) ?? 0, notifies.get(open.id) ?? 0),
      viewerLiked: viewer.liked,
      viewerNotified: viewer.notified,
    };
  }

  // -------------------------------------------------- customer actions

  /** ❤️ / 🔔 only make sense while a cycle is actively testing demand — not once importing has started. */
  private async requireActiveCycle(productId: string) {
    const open = await this.repo.findOpenCycle(productId);
    if (!open || open.status !== "active") {
      throw new ConflictError("This product isn't taking WANTED interest right now");
    }
    return open;
  }

  async like(productId: string, customerId: string): Promise<void> {
    const cycle = await this.requireActiveCycle(productId);
    await this.repo.addLike(cycle.id, customerId);
  }

  async unlike(productId: string, customerId: string): Promise<void> {
    const open = await this.repo.findOpenCycle(productId);
    if (open) await this.repo.removeLike(open.id, customerId);
  }

  async requestNotify(productId: string, customerId: string): Promise<void> {
    const cycle = await this.requireActiveCycle(productId);
    await this.repo.addNotifyRequest(cycle.id, customerId);
  }

  async cancelNotify(productId: string, customerId: string): Promise<void> {
    const open = await this.repo.findOpenCycle(productId);
    if (open) await this.repo.removeNotifyRequest(open.id, customerId);
  }

  // --------------------------------------------------- owner lifecycle

  /** Open a fresh WANTED cycle. Used both for a brand-new product and for cycle #2+ after an EXPRESS product sold out. */
  async startWanted(ownerId: string, productId: string): Promise<WantedCycleRow> {
    const product = await this.getOwnedProduct(productId, ownerId);
    return this.openCycleFor(product.id, product.lifecycle);
  }

  /** Same transition, skipping the ownership check — the caller (ProductsService.create) just created the product. */
  async startWantedForNewProduct(productId: string): Promise<WantedCycleRow> {
    return this.openCycleFor(productId, "express");
  }

  private async openCycleFor(
    productId: string,
    currentLifecycle: "wanted" | "importing" | "express",
  ): Promise<WantedCycleRow> {
    if (currentLifecycle !== "express") {
      throw new ConflictError("This product already has an open WANTED cycle");
    }
    const existing = await this.repo.findOpenCycle(productId);
    if (existing) throw new ConflictError("This product already has an open WANTED cycle");

    const cycleNumber = await this.repo.nextCycleNumber(productId);
    const cycle = await this.repo.createCycle(productId, cycleNumber);
    // Reuse the existing non-purchasable stock state — Orders already blocks
    // checkout on "coming_soon", so WANTED products are not buyable for free.
    // Quantity is meaningless until an import completes (§5), so it resets to
    // 0 here; completeImport adds the imported quantity back.
    await productsRepository.update(productId, {
      lifecycle: "wanted",
      status: "coming_soon",
      availableQuantity: 0,
    });
    eventBus.publish("wanted.cycle.started", { productId, cycleId: cycle.id, cycleNumber });
    return cycle;
  }

  async startImporting(ownerId: string, productId: string): Promise<WantedCycleRow> {
    await this.getOwnedProduct(productId, ownerId);
    const open = await this.repo.findOpenCycle(productId);
    if (!open || open.status !== "active") {
      throw new ConflictError("There is no active WANTED cycle to move into importing");
    }
    const updated = await this.repo.setCycleStatus(open.id, "importing", { importingAt: new Date() });
    await productsRepository.update(productId, { lifecycle: "importing" });
    eventBus.publish("wanted.cycle.importing", { productId, cycleId: open.id });
    return updated!;
  }

  /**
   * Import arrived → add stock and flip to EXPRESS. The WANTED cycle is
   * marked COMPLETED with its imported quantity; its ❤️/🔔 rows are kept as
   * history (§3, §18) and simply stop being "current" because there's no
   * open cycle any more.
   */
  async completeImport(
    ownerId: string,
    productId: string,
    importedQuantity: number,
  ): Promise<WantedCycleRow> {
    const product = await this.getOwnedProduct(productId, ownerId);
    const open = await this.repo.findOpenCycle(productId);
    if (!open || open.status === "completed") {
      throw new ConflictError("There is no WANTED cycle to complete for this product");
    }

    const nextQuantity = product.availableQuantity + importedQuantity;
    await productsRepository.update(productId, {
      lifecycle: "express",
      availableQuantity: nextQuantity,
      status: deriveProductStatus(nextQuantity, false),
    });
    const completed = await this.repo.setCycleStatus(open.id, "completed", {
      importedQuantity,
      completedAt: new Date(),
    });

    eventBus.publish("wanted.cycle.completed", { productId, cycleId: open.id, importedQuantity });
    return completed!;
  }

  // --------------------------------------------------------- analytics

  async getCycleAnalytics(productId: string): Promise<WantedCycleAnalytics[]> {
    const product = await productsRepository.findById(productId);
    if (!product) throw new NotFoundError("Product not found");

    const cycles = await this.repo.listByProduct(productId);
    if (cycles.length === 0) return [];

    const ids = cycles.map((c) => c.id);
    const [likes, notifies] = await Promise.all([
      this.repo.likeCounts(ids),
      this.repo.notifyCounts(ids),
    ]);

    const completed = cycles
      .filter((c) => c.completedAt)
      .sort((a, b) => a.completedAt!.getTime() - b.completedAt!.getTime());

    const result: WantedCycleAnalytics[] = [];
    for (const cycle of cycles) {
      const base = {
        id: cycle.id,
        cycleNumber: cycle.cycleNumber,
        status: cycle.status,
        likes: likes.get(cycle.id) ?? 0,
        notifyRequests: notifies.get(cycle.id) ?? 0,
        importedQuantity: cycle.importedQuantity,
        createdAt: cycle.createdAt,
        importingAt: cycle.importingAt,
        completedAt: cycle.completedAt,
      };

      if (!cycle.completedAt) {
        result.push({
          ...base,
          unitsSold: null,
          remainingStock: null,
          notifyToPurchase: null,
        });
        continue;
      }

      // Sales window: from this cycle completing until the next cycle opened (or now).
      const idx = completed.findIndex((c) => c.id === cycle.id);
      const nextCompletedAt = completed[idx + 1]?.completedAt ?? null;
      const { unitsSold, buyerIds } = await this.repo.salesForWindow(
        productId,
        cycle.completedAt,
        nextCompletedAt,
      );

      const requesterIds = new Set(await this.repo.notifyRequesterIds(cycle.id));
      const purchased = buyerIds.filter((id) => requesterIds.has(id)).length;
      const notified = requesterIds.size;

      // The most recent completed cycle owns the product's current live stock.
      const isCurrentExpressCycle =
        idx === completed.length - 1 && product.lifecycle === "express";
      const remainingStock = isCurrentExpressCycle
        ? product.availableQuantity
        : Math.max(0, (cycle.importedQuantity ?? 0) - unitsSold);

      result.push({
        ...base,
        unitsSold,
        remainingStock,
        notifyToPurchase: {
          notified,
          purchased,
          rate: notified > 0 ? purchased / notified : 0,
        },
      });
    }
    return result;
  }

  // ------------------------------------------------- owner dashboard

  async listOwnerWantedProducts(ownerId: string, ownerRole: "seller" | "merchant") {
    const open = await this.repo.listOpenCyclesWithProduct();
    const mine = open.filter(
      (c) => c.product.ownerId === ownerId && c.product.ownerRole === ownerRole,
    );
    if (mine.length === 0) return [];

    const ids = mine.map((c) => c.id);
    const [likes, notifies] = await Promise.all([
      this.repo.likeCounts(ids),
      this.repo.notifyCounts(ids),
    ]);
    return mine.map((c) => ({
      productId: c.productId,
      productName: c.product.name,
      cycleId: c.id,
      cycleNumber: c.cycleNumber,
      status: c.status,
      likes: likes.get(c.id) ?? 0,
      notifyRequests: notifies.get(c.id) ?? 0,
      createdAt: c.createdAt,
    }));
  }
}

export const wantedService = new WantedService(wantedRepository);

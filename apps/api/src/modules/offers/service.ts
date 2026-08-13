import type { CreateOfferInput, UpdateOfferInput } from "@foryou/shared";
import { ConflictError, ForbiddenError, NotFoundError } from "../../lib/http-errors.js";
import { eventBus } from "../../lib/events.js";
import { importRequestsRepository } from "../import-requests/repository.js";
import { ordersRepository } from "../orders/repository.js";
import { usersService } from "../users/service.js";
import { offersRepository, type OffersRepository, type OfferRow } from "./repository.js";
import "./events.js";
import "../import-requests/events.js";

const DEPOSIT_DEADLINE_HOURS = 24;

export class OffersService {
  constructor(private readonly repo: OffersRepository) {}

  async submit(sellerId: string, importRequestId: string, input: CreateOfferInput) {
    const request = await importRequestsRepository.findById(importRequestId);
    if (!request) throw new NotFoundError("Import request not found");
    if (request.status !== "open")
      throw new ConflictError("This request is no longer accepting offers");

    const existing = await this.repo.findActiveBySellerAndRequest(importRequestId, sellerId);
    if (existing)
      throw new ConflictError(
        "You've already submitted an offer for this request — edit it instead",
      );

    const offer = await this.repo.create({
      importRequestId,
      sellerId,
      totalPrice: input.totalPrice.toFixed(2),
      estimatedDeliveryDays: input.estimatedDeliveryDays,
      depositPercentage: input.depositPercentage,
    });
    eventBus.publish("offer.submitted", {
      offerId: offer.id,
      importRequestId,
      sellerId,
      customerId: request.customerId,
    });
    return offer;
  }

  private async getOwnedActive(offerId: string, sellerId: string) {
    const offer = await this.repo.findById(offerId);
    if (!offer) throw new NotFoundError("Offer not found");
    if (offer.sellerId !== sellerId) throw new ForbiddenError("This isn't your offer");
    if (offer.status !== "active") throw new ConflictError("This offer can no longer be changed");
    return offer;
  }

  /** BRD Rule 3 Stage 2: "Seller may edit the offer until the customer selects a Seller." */
  async edit(sellerId: string, offerId: string, input: UpdateOfferInput) {
    await this.getOwnedActive(offerId, sellerId);
    const updated = await this.repo.update(offerId, {
      totalPrice: input.totalPrice !== undefined ? input.totalPrice.toFixed(2) : undefined,
      estimatedDeliveryDays: input.estimatedDeliveryDays,
      depositPercentage: input.depositPercentage,
    });
    eventBus.publish("offer.edited", { offerId });
    return updated;
  }

  async cancel(sellerId: string, offerId: string) {
    const offer = await this.getOwnedActive(offerId, sellerId);
    const updated = await this.repo.update(offerId, { status: "cancelled" });
    eventBus.publish("offer.cancelled", { offerId, importRequestId: offer.importRequestId });
    return updated;
  }

  /**
   * The owning customer sees every active offer (BRD Stage 3 comparison).
   * A seller only sees their own offer on this request, never a competitor's
   * price — preserving the blind-bidding design already used elsewhere
   * (see `ImportRequestsRepository.listOpenForSeller`'s doc comment).
   * Anyone else — including a seller who never bid on this request — gets 403.
   *
   * Each returned offer carries the *submitting seller's* name — safe to show
   * to the customer regardless of blind bidding, since that rule only hides
   * the customer's identity from sellers, never the reverse.
   */
  async listForRequest(requesterId: string, importRequestId: string) {
    const request = await importRequestsRepository.findById(importRequestId);
    if (!request) throw new NotFoundError("Import request not found");

    const own =
      request.customerId === requesterId
        ? await this.repo.listForRequest(importRequestId)
        : await this.repo.findActiveBySellerAndRequest(importRequestId, requesterId).then((o) =>
            o ? [o] : null,
          );
    if (!own) throw new ForbiddenError("You don't have access to this request's offers");

    return this.withSellerNames(own);
  }

  /**
   * A seller only ever sees their own offers — each already means they've
   * bid on that request, so attaching the customer's name here is a narrow
   * carve-out of blind bidding (post-bid only), not a removal of it: a
   * seller still never sees a customer's identity while merely browsing or
   * deciding whether to bid (`listOpenForSeller`/`getForSeller` are untouched).
   */
  async listForSeller(sellerId: string) {
    const offers = await this.repo.listForSeller(sellerId);
    if (offers.length === 0) return offers;

    const requests = await importRequestsRepository.findByIds([
      ...new Set(offers.map((o) => o.importRequestId)),
    ]);
    const customerIdByRequestId = new Map(requests.map((r) => [r.id, r.customerId]));
    const customerNames = await usersService.getCustomerDisplayNames([
      ...new Set(requests.map((r) => r.customerId)),
    ]);

    return offers.map((offer) => {
      const customerId = customerIdByRequestId.get(offer.importRequestId);
      const customer = customerId ? customerNames.get(customerId) : undefined;
      return {
        ...offer,
        customerName: customer?.name ?? null,
        customerMemberSince: customer?.memberSince ?? null,
      };
    });
  }

  private async withSellerNames(offers: OfferRow[]) {
    const sellerNames = await usersService.getSellerDisplayNames([
      ...new Set(offers.map((o) => o.sellerId)),
    ]);
    return offers.map((offer) => {
      const seller = sellerNames.get(offer.sellerId);
      return {
        ...offer,
        sellerName: seller?.name ?? null,
        sellerMemberSince: seller?.memberSince ?? null,
      };
    });
  }

  /**
   * BRD Rule 3 Stage 3 → Rule 4: selecting an offer closes the request,
   * rejects every other offer, and creates the order in `awaiting_deposit`
   * with a 24h deposit deadline. Paying that deposit (Paymob, wallet credit,
   * commission) is Phase 8 — this only opens the door for it.
   */
  async select(customerId: string, offerId: string) {
    const offer = await this.repo.findById(offerId);
    if (!offer) throw new NotFoundError("Offer not found");
    if (offer.status !== "active") throw new ConflictError("This offer is no longer available");

    const request = await importRequestsRepository.findById(offer.importRequestId);
    if (!request) throw new NotFoundError("Import request not found");
    if (request.customerId !== customerId) throw new ForbiddenError("This isn't your request");
    if (request.status !== "open") throw new ConflictError("This request has already been closed");

    const depositAmount = (Number(offer.totalPrice) * (offer.depositPercentage / 100)).toFixed(2);
    const depositDeadlineAt = new Date(Date.now() + DEPOSIT_DEADLINE_HOURS * 60 * 60 * 1000);

    const order = await ordersRepository.create({
      type: "import",
      customerId,
      importRequestId: request.id,
      offerId: offer.id,
      sellerId: offer.sellerId,
      totalAmount: offer.totalPrice,
      depositPercentage: offer.depositPercentage,
      depositAmount,
      stage: "awaiting_deposit",
      depositDeadlineAt,
    });

    await this.repo.update(offerId, { status: "selected" });
    const rejected = await this.repo.rejectOthers(request.id, offerId);
    await importRequestsRepository.setStatus(request.id, "offer_selected");

    eventBus.publish("offer.selected", {
      offerId,
      importRequestId: request.id,
      sellerId: offer.sellerId,
      customerId,
      orderId: order.id,
    });
    for (const rejectedOffer of rejected) {
      eventBus.publish("offer.rejected", {
        offerId: rejectedOffer.id,
        sellerId: rejectedOffer.sellerId,
      });
    }
    eventBus.publish("import_request.closed", {
      importRequestId: request.id,
      reason: "offer_selected",
    });

    return order;
  }
}

export const offersService = new OffersService(offersRepository);

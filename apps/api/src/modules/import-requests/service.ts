import type { CreateImportRequestInput } from "@foryou/shared";
import { db } from "../../db/index.js";
import { sellerProfiles } from "../users/schema.js";
import { sql } from "drizzle-orm";
import { ForbiddenError, NotFoundError, ConflictError } from "../../lib/http-errors.js";
import { eventBus } from "../../lib/events.js";
import { importRequestsRepository, type ImportRequestsRepository } from "./repository.js";
import { offersRepository } from "../offers/repository.js";
import { usersService } from "../users/service.js";
import "./events.js";

export class ImportRequestsService {
  constructor(private readonly repo: ImportRequestsRepository) {}

  async create(customerId: string, input: CreateImportRequestInput) {
    const request = await this.repo.create(
      { customerId, notes: input.notes, sourceCountry: input.sourceCountry },
      input.links,
    );
    eventBus.publish("import_request.created", { importRequestId: request.id, customerId });

    const matchedSellerIds = await this.findMatchingSellerIds(input.sourceCountry);
    eventBus.publish("import_request.distributed", {
      importRequestId: request.id,
      matchedSellerIds,
    });

    return this.repo.findById(request.id);
  }

  /** Every row in `seller_profiles` already belongs to an account with the seller role — no extra role join needed. */
  private async findMatchingSellerIds(sourceCountry?: string): Promise<string[]> {
    const rows = sourceCountry
      ? await db
          .select({ userId: sellerProfiles.userId })
          .from(sellerProfiles)
          .where(sql`${sourceCountry} = any(${sellerProfiles.importCountries})`)
      : await db.select({ userId: sellerProfiles.userId }).from(sellerProfiles);

    return rows.map((r) => r.userId);
  }

  async getMine(customerId: string, id: string) {
    const request = await this.repo.findById(id);
    if (!request || request.customerId !== customerId)
      throw new NotFoundError("Import request not found");
    return request;
  }

  listMine(customerId: string) {
    return this.repo.listForCustomer(customerId);
  }

  /**
   * A seller sees every request matched to them — no prices (that stays
   * blind, competing sellers never see each other's bids), but the
   * customer's name is shown so a seller knows who they'd be dealing with
   * before deciding whether to bid.
   */
  async listOpenForSeller(sellerId: string) {
    return this.withCustomerNames(await this.repo.listOpenForSeller(sellerId));
  }

  /**
   * A seller may only view requests that were actually matched to them (same
   * country criteria as the queue) or that they've already bid on — otherwise
   * this leaks other customers' notes/links to any authenticated seller who
   * guesses an id. 404 (not 403) to match the ownership-check convention
   * used elsewhere in this codebase and avoid confirming the id exists.
   */
  async getForSeller(sellerId: string, id: string) {
    const request = await this.repo.findById(id);
    if (!request) throw new NotFoundError("Import request not found");

    const visible =
      (await this.repo.isMatchedToSeller(request, sellerId)) ||
      (await offersRepository.existsForSellerAndRequest(id, sellerId));
    if (!visible) throw new NotFoundError("Import request not found");

    return this.withCustomerName(request);
  }

  private async withCustomerNames<T extends { customerId: string }>(requests: T[]) {
    const customerNames = await usersService.getCustomerDisplayNames([
      ...new Set(requests.map((r) => r.customerId)),
    ]);
    return requests.map((request) => {
      const customer = customerNames.get(request.customerId);
      return {
        ...request,
        customerName: customer?.name ?? null,
        customerMemberSince: customer?.memberSince ?? null,
      };
    });
  }

  private async withCustomerName<T extends { customerId: string }>(request: T) {
    const customer = (await usersService.getCustomerDisplayNames([request.customerId])).get(
      request.customerId,
    );
    return {
      ...request,
      customerName: customer?.name ?? null,
      customerMemberSince: customer?.memberSince ?? null,
    };
  }

  async ignore(sellerId: string, id: string): Promise<void> {
    const request = await this.repo.findById(id);
    if (!request) throw new NotFoundError("Import request not found");
    await this.repo.ignore(id, sellerId);
  }

  async cancel(customerId: string, id: string): Promise<void> {
    const request = await this.getMine(customerId, id);
    if (request.status !== "open") {
      throw new ConflictError(
        "This request can no longer be cancelled — an offer has already been selected",
      );
    }
    await this.repo.setStatus(id, "closed");
    eventBus.publish("import_request.closed", { importRequestId: id, reason: "cancelled" });
  }

  async requireOpen(id: string) {
    const request = await this.repo.findById(id);
    if (!request) throw new NotFoundError("Import request not found");
    if (request.status !== "open")
      throw new ConflictError("This request is no longer accepting offers");
    return request;
  }

  async requireOwnedByCustomer(id: string, customerId: string) {
    const request = await this.repo.findById(id);
    if (!request) throw new NotFoundError("Import request not found");
    if (request.customerId !== customerId) throw new ForbiddenError("This isn't your request");
    return request;
  }
}

export const importRequestsService = new ImportRequestsService(importRequestsRepository);

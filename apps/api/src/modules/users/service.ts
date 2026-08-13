import { eq } from "drizzle-orm";
import type { Role } from "@foryou/shared";
import { db } from "../../db/index.js";
import { NotFoundError, ConflictError, ForbiddenError } from "../../lib/http-errors.js";
import { eventBus } from "../../lib/events.js";
import { usersRepository, type UsersRepository } from "./repository.js";
import { customerProfiles, sellerProfiles, merchantProfiles } from "./schema.js";
import "./events.js";
import type {
  UpdateCustomerProfileInput,
  UpdateSellerProfileInput,
  UpdateMerchantProfileInput,
  AddSellerRoleInput,
  AddMerchantRoleInput,
  CreateAddressInput,
  UpdateAddressInput,
} from "./dto.js";

export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async getMe(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundError("User not found");

    const [roles, customerProfile, sellerProfile, merchantProfile, addresses] = await Promise.all([
      this.repo.getRoles(userId),
      this.repo.getCustomerProfile(userId),
      this.repo.getSellerProfile(userId),
      this.repo.getMerchantProfile(userId),
      this.repo.listAddresses(userId),
    ]);

    return {
      id: user.id,
      email: user.email,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      roles,
      customerProfile: customerProfile ?? null,
      sellerProfile: sellerProfile ?? null,
      merchantProfile: merchantProfile ?? null,
      addresses,
    };
  }

  async updateCustomerProfile(userId: string, data: UpdateCustomerProfileInput) {
    await this.requireRole(userId, "customer");
    const [row] = await db
      .update(customerProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customerProfiles.userId, userId))
      .returning();
    if (!row) throw new NotFoundError("Customer profile not found");
    eventBus.publish("user.profile_updated", { userId });
    return row;
  }

  async updateSellerProfile(userId: string, data: UpdateSellerProfileInput) {
    await this.requireRole(userId, "seller");
    const [row] = await db
      .update(sellerProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sellerProfiles.userId, userId))
      .returning();
    if (!row) throw new NotFoundError("Seller profile not found");
    eventBus.publish("user.profile_updated", { userId });
    return row;
  }

  async updateMerchantProfile(userId: string, data: UpdateMerchantProfileInput) {
    await this.requireRole(userId, "merchant");
    const [row] = await db
      .update(merchantProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(merchantProfiles.userId, userId))
      .returning();
    if (!row) throw new NotFoundError("Merchant profile not found");
    eventBus.publish("user.profile_updated", { userId });
    return row;
  }

  /** BRD Rule 1 "Multiple Roles": add Seller to an account that's already Customer/Merchant/etc. */
  async addSellerRole(userId: string, data: AddSellerRoleInput) {
    if (await this.repo.hasRole(userId, "seller")) {
      throw new ConflictError("Account already has the seller role");
    }
    await this.repo.addRole(userId, "seller");
    const [profile] = await this.repo.createSellerProfile({ userId, ...data });
    eventBus.publish("user.role_added", { userId, role: "seller" });
    return profile;
  }

  async addMerchantRole(userId: string, data: AddMerchantRoleInput) {
    if (await this.repo.hasRole(userId, "merchant")) {
      throw new ConflictError("Account already has the merchant role");
    }
    await this.repo.addRole(userId, "merchant");
    const [profile] = await this.repo.createMerchantProfile({ userId, ...data });
    eventBus.publish("user.role_added", { userId, role: "merchant" });
    return profile;
  }

  listAddresses(userId: string) {
    return this.repo.listAddresses(userId);
  }

  createAddress(userId: string, data: CreateAddressInput) {
    return this.repo.createAddress({ userId, ...data });
  }

  async updateAddress(userId: string, addressId: string, data: UpdateAddressInput) {
    const existing = await this.repo.getAddress(addressId, userId);
    if (!existing) throw new NotFoundError("Address not found");
    return this.repo.updateAddress(addressId, userId, data);
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const existing = await this.repo.getAddress(addressId, userId);
    if (!existing) throw new NotFoundError("Address not found");
    await this.repo.deleteAddress(addressId, userId);
  }

  private async requireRole(userId: string, role: Role): Promise<void> {
    const has = await this.repo.hasRole(userId, role);
    if (!has) throw new ForbiddenError(`Account does not hold the ${role} role`);
  }

  // ------------------------------------------------------------- admin

  listForAdmin(filters: {
    role?: Role;
    status?: "active" | "suspended" | "banned";
    search?: string;
  }) {
    return this.repo.listForAdmin(filters);
  }

  getForAdmin(userId: string) {
    return this.getMe(userId); // same shape — nothing about a user's own account is hidden from admins
  }

  async suspend(userId: string, reason?: string): Promise<void> {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundError("User not found");
    if (user.status === "suspended") throw new ConflictError("This account is already suspended");
    await this.repo.setStatus(userId, "suspended");
    eventBus.publish("user.suspended", { userId, reason });
  }

  async reactivate(userId: string): Promise<void> {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundError("User not found");
    if (user.status === "active") throw new ConflictError("This account is already active");
    await this.repo.setStatus(userId, "active");
    eventBus.publish("user.reactivated", { userId });
  }

  /** Used by other modules (e.g. offers) to show a counterparty's name — never their email/PII beyond that. */
  getSellerDisplayNames(userIds: string[]) {
    return this.repo.getSellerDisplayNames(userIds);
  }

  getCustomerDisplayNames(userIds: string[]) {
    return this.repo.getCustomerDisplayNames(userIds);
  }

  countByRole() {
    return this.repo.countByRole();
  }

  countByStatus() {
    return this.repo.countByStatus();
  }
}

export const usersService = new UsersService(usersRepository);

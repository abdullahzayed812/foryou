import { eq, and, desc, ilike, count, inArray } from "drizzle-orm";
import type { Role } from "@foryou/shared";
import { db } from "../../db/index.js";
import {
  users,
  userRoles,
  customerProfiles,
  sellerProfiles,
  merchantProfiles,
  addresses,
} from "./schema.js";

export type NewCustomerProfile = typeof customerProfiles.$inferInsert;
export type NewSellerProfile = typeof sellerProfiles.$inferInsert;
export type NewMerchantProfile = typeof merchantProfiles.$inferInsert;
export type UserRow = typeof users.$inferSelect;
export type AddressRow = typeof addresses.$inferSelect;

/**
 * Owns every query against the Identity & Access tables. Nothing outside
 * this file imports Drizzle for `users`/`user_roles`/`*_profiles`/`addresses`
 * — other modules go through UsersService (Repository Pattern, §02).
 */
export class UsersRepository {
  findById(id: string) {
    return db.query.users.findFirst({ where: eq(users.id, id) });
  }

  findByEmail(email: string) {
    return db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
  }

  async createUser(data: { email: string; passwordHash: string }): Promise<UserRow> {
    const [row] = await db
      .insert(users)
      .values({ email: data.email.toLowerCase(), passwordHash: data.passwordHash })
      .returning();
    if (!row) throw new Error("failed to create user");
    return row;
  }

  async markEmailVerified(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async setStatus(userId: string, status: UserRow["status"]): Promise<void> {
    await db.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async addRole(userId: string, role: Role): Promise<void> {
    await db.insert(userRoles).values({ userId, role }).onConflictDoNothing();
  }

  async getRoles(userId: string): Promise<Role[]> {
    const rows = await db.query.userRoles.findMany({ where: eq(userRoles.userId, userId) });
    return rows.map((r) => r.role);
  }

  async hasRole(userId: string, role: Role): Promise<boolean> {
    const row = await db.query.userRoles.findFirst({
      where: and(eq(userRoles.userId, userId), eq(userRoles.role, role)),
    });
    return Boolean(row);
  }

  createCustomerProfile(data: NewCustomerProfile) {
    return db.insert(customerProfiles).values(data).returning();
  }

  createSellerProfile(data: NewSellerProfile) {
    return db.insert(sellerProfiles).values(data).returning();
  }

  createMerchantProfile(data: NewMerchantProfile) {
    return db.insert(merchantProfiles).values(data).returning();
  }

  getCustomerProfile(userId: string) {
    return db.query.customerProfiles.findFirst({ where: eq(customerProfiles.userId, userId) });
  }

  getSellerProfile(userId: string) {
    return db.query.sellerProfiles.findFirst({ where: eq(sellerProfiles.userId, userId) });
  }

  getMerchantProfile(userId: string) {
    return db.query.merchantProfiles.findFirst({ where: eq(merchantProfiles.userId, userId) });
  }

  /**
   * Batch name lookups for showing a counterparty's name on offers/import
   * requests (e.g. a seller's name on the offer a customer is reviewing) —
   * `inArray` + a single query instead of N+1 per-row lookups. Inner-joined
   * to the relevant profile table, so an id with no such profile is just
   * absent from the returned map rather than erroring.
   */
  async getSellerDisplayNames(
    userIds: string[],
  ): Promise<Map<string, { name: string; memberSince: Date }>> {
    if (userIds.length === 0) return new Map();
    const rows = await db
      .select({ id: users.id, fullName: sellerProfiles.fullName, createdAt: users.createdAt })
      .from(users)
      .innerJoin(sellerProfiles, eq(sellerProfiles.userId, users.id))
      .where(inArray(users.id, userIds));
    return new Map(rows.map((r) => [r.id, { name: r.fullName, memberSince: r.createdAt }]));
  }

  async getCustomerDisplayNames(
    userIds: string[],
  ): Promise<Map<string, { name: string; memberSince: Date }>> {
    if (userIds.length === 0) return new Map();
    const rows = await db
      .select({
        id: users.id,
        firstName: customerProfiles.firstName,
        lastName: customerProfiles.lastName,
        createdAt: users.createdAt,
      })
      .from(users)
      .innerJoin(customerProfiles, eq(customerProfiles.userId, users.id))
      .where(inArray(users.id, userIds));
    return new Map(
      rows.map((r) => [
        r.id,
        { name: `${r.firstName} ${r.lastName}`.trim(), memberSince: r.createdAt },
      ]),
    );
  }

  listAddresses(userId: string) {
    return db.query.addresses.findMany({ where: eq(addresses.userId, userId) });
  }

  async createAddress(
    data: Omit<typeof addresses.$inferInsert, "id" | "createdAt" | "updatedAt">,
  ): Promise<AddressRow> {
    if (data.isDefault) {
      await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, data.userId));
    }
    const [row] = await db.insert(addresses).values(data).returning();
    if (!row) throw new Error("failed to create address");
    return row;
  }

  getAddress(id: string, userId: string) {
    return db.query.addresses.findFirst({
      where: and(eq(addresses.id, id), eq(addresses.userId, userId)),
    });
  }

  async updateAddress(
    id: string,
    userId: string,
    data: Partial<Omit<typeof addresses.$inferInsert, "id" | "userId" | "createdAt">>,
  ): Promise<AddressRow | undefined> {
    if (data.isDefault) {
      await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
    }
    const [row] = await db
      .update(addresses)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .returning();
    return row;
  }

  async deleteAddress(id: string, userId: string): Promise<void> {
    await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
  }

  // ------------------------------------------------------------- admin

  /**
   * Admin user directory — filterable by role/status/email search, newest
   * first. Explicitly column-selected (never the bare row) so `passwordHash`
   * can't leak into this list response — this is the one query in the
   * module returned straight to `res.json()` for an external list view,
   * unlike `findById`/`getMe`, which stay internal or get reshaped by the
   * service before they ever reach a response.
   */
  async listForAdmin(filters: { role?: Role; status?: UserRow["status"]; search?: string }) {
    const safeColumns = {
      id: users.id,
      email: users.email,
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    } as const;

    if (filters.role) {
      return db
        .select(safeColumns)
        .from(users)
        .innerJoin(userRoles, eq(userRoles.userId, users.id))
        .where(
          and(
            eq(userRoles.role, filters.role),
            filters.status ? eq(users.status, filters.status) : undefined,
            filters.search ? ilike(users.email, `%${filters.search}%`) : undefined,
          ),
        )
        .orderBy(desc(users.createdAt));
    }

    return db
      .select(safeColumns)
      .from(users)
      .where(
        and(
          filters.status ? eq(users.status, filters.status) : undefined,
          filters.search ? ilike(users.email, `%${filters.search}%`) : undefined,
        ),
      )
      .orderBy(desc(users.createdAt));
  }

  async countByRole(): Promise<{ role: Role; count: number }[]> {
    const rows = await db
      .select({ role: userRoles.role, count: count() })
      .from(userRoles)
      .groupBy(userRoles.role);
    return rows.map((r) => ({ role: r.role, count: Number(r.count) }));
  }

  async countByStatus(): Promise<{ status: UserRow["status"]; count: number }[]> {
    const rows = await db
      .select({ status: users.status, count: count() })
      .from(users)
      .groupBy(users.status);
    return rows.map((r) => ({ status: r.status, count: Number(r.count) }));
  }
}

export const usersRepository = new UsersRepository();

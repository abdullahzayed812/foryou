import { eq } from "drizzle-orm";
import { db, closeDb } from "./index.js";
import { logger } from "../lib/logger.js";
import { isProd } from "../config/env.js";
import type { CategoryRow } from "../modules/categories/repository.js";
import type { BrandRow } from "../modules/brands/repository.js";
import {
  users,
  userRoles,
  sellerProfiles,
  merchantProfiles,
  customerProfiles,
} from "../modules/users/schema.js";
import { hashPassword } from "../modules/auth/password.js";
import { categoriesService } from "../modules/categories/service.js";
import { brandsService } from "../modules/brands/service.js";
import { trustScoreService } from "../modules/trust-score/service.js";
import type { Role } from "@foryou/shared";

// No product/verification seeding yet — both require real uploaded images
// (product cover image, national ID/selfie/commercial registration docs),
// and media storage (R2 in prod, MinIO in dev) isn't configured everywhere
// yet. Once it is, seed products/verification via the real service methods
// the same way src/test/helpers.ts and this file already do for users.

const SEED_PASSWORD = "Password123";

// Every write below is idempotent (ON CONFLICT DO NOTHING against the
// table's unique key), so `db:seed` can be re-run any number of times: it
// tops up whatever is missing and touches nothing that already exists.
async function createUser(email: string, role: Role) {
  const passwordHash = await hashPassword(SEED_PASSWORD);
  const [inserted] = await db
    .insert(users)
    .values({ email, passwordHash, emailVerifiedAt: new Date() })
    .onConflictDoNothing({ target: users.email })
    .returning();
  const user =
    inserted ?? (await db.select().from(users).where(eq(users.email, email)))[0];
  if (!user) throw new Error(`failed to create user ${email}`);

  await db.insert(userRoles).values({ userId: user.id, role }).onConflictDoNothing();
  await trustScoreService.ensureInitialized(user.id);

  if (role === "customer") {
    await db
      .insert(customerProfiles)
      .values({
        userId: user.id,
        firstName: "Layla",
        lastName: "Hassan",
        governorate: "Cairo",
        city: "Nasr City",
        mobileNumber: "01011111111",
      })
      .onConflictDoNothing();
  } else if (role === "seller") {
    await db
      .insert(sellerProfiles)
      .values({
        userId: user.id,
        fullName: "Mostafa Adel",
        phoneNumber: "01022222222",
        importCountries: ["Turkey", "China"],
        productCategories: ["Electronics", "Fashion"],
      })
      .onConflictDoNothing();
  } else if (role === "merchant") {
    await db
      .insert(merchantProfiles)
      .values({
        userId: user.id,
        businessName: "Cairo Ready Stock Co.",
        ownerName: "Nourhan Samir",
        phoneNumber: "01033333333",
        governorate: "Giza",
        city: "6th of October",
        businessCategory: "Electronics & Home",
        importCountry: "China",
      })
      .onConflictDoNothing();
  }
  return user;
}

async function main() {
  // These are publicly-known demo credentials (see LoginPage.tsx's dev
  // quick-login buttons), so seeding a real production DB is refused by
  // default. A throwaway demo/staging box that deliberately wants them can
  // opt in with ALLOW_PROD_SEED=1 — this keeps NODE_ENV=production, so the
  // prod image's logger doesn't try to load the pruned pino-pretty devDep.
  if (isProd && process.env.ALLOW_PROD_SEED !== "1") {
    throw new Error(
      "db:seed refuses to run with NODE_ENV=production. If this is a demo box and you really want the public demo accounts, re-run with ALLOW_PROD_SEED=1.",
    );
  }

  const existingCategories = await categoriesService.list();
  const categoryBySlug = new Map<string, CategoryRow>(
    existingCategories.map((c) => [c.slug, c]),
  );
  const ensureCategory = async (
    input: Parameters<typeof categoriesService.create>[0],
  ): Promise<CategoryRow> => {
    const existing = categoryBySlug.get(input.slug);
    if (existing) return existing;
    const created = await categoriesService.create(input);
    categoryBySlug.set(created.slug, created);
    return created;
  };

  const existingBrands = await brandsService.list();
  const brandSlugs = new Set<string>(existingBrands.map((b: BrandRow) => b.slug));
  const ensureBrand = async (name: string, slug: string) => {
    if (brandSlugs.has(slug)) return;
    await brandsService.create({ name, slug });
    brandSlugs.add(slug);
  };

  logger.info("Seeding categories…");
  const electronics = await ensureCategory({
    nameEn: "Electronics",
    nameAr: "إلكترونيات",
    slug: "electronics",
  });
  await ensureCategory({
    nameEn: "Mobile Phones",
    nameAr: "هواتف محمولة",
    slug: "mobile-phones",
    parentId: electronics.id,
  });
  await ensureCategory({
    nameEn: "Laptops & Computers",
    nameAr: "لابتوبات وأجهزة كمبيوتر",
    slug: "laptops-computers",
    parentId: electronics.id,
  });
  const fashion = await ensureCategory({
    nameEn: "Fashion",
    nameAr: "أزياء",
    slug: "fashion",
  });
  await ensureCategory({
    nameEn: "Shoes",
    nameAr: "أحذية",
    slug: "shoes",
    parentId: fashion.id,
  });
  await ensureCategory({
    nameEn: "Bags & Accessories",
    nameAr: "حقائب وإكسسوارات",
    slug: "bags-accessories",
    parentId: fashion.id,
  });
  await ensureCategory({
    nameEn: "Home & Kitchen",
    nameAr: "المنزل والمطبخ",
    slug: "home-kitchen",
  });

  logger.info("Seeding brands…");
  await ensureBrand("Apple", "apple");
  await ensureBrand("Samsung", "samsung");
  await ensureBrand("Nike", "nike");
  await ensureBrand("Adidas", "adidas");
  await ensureBrand("Zara", "zara");
  await ensureBrand("IKEA", "ikea");

  logger.info("Seeding users…");
  await createUser("admin@foryou.dev", "admin");
  await createUser("customer@foryou.dev", "customer");
  await createUser("seller@foryou.dev", "seller");
  await createUser("merchant@foryou.dev", "merchant");

  logger.info("Seed complete.");
  logger.info("Login with any of these (password for all: Password123):");
  logger.info("  admin@foryou.dev    — admin");
  logger.info("  customer@foryou.dev — customer");
  logger.info("  seller@foryou.dev   — seller (not yet verified — submit verification via the UI)");
  logger.info(
    "  merchant@foryou.dev — merchant (not yet verified — submit verification via the UI)",
  );
}

main()
  .catch((err: unknown) => {
    logger.error({ err }, "Seed failed");
    process.exitCode = 1;
  })
  .finally(() => closeDb());

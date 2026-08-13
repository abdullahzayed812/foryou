import { eq } from "drizzle-orm";
import { db, closeDb } from "./index.js";
import { logger } from "../lib/logger.js";
import { isProd } from "../config/env.js";
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

async function createUser(email: string, role: Role) {
  const passwordHash = await hashPassword(SEED_PASSWORD);
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash, emailVerifiedAt: new Date() })
    .returning();
  if (!user) throw new Error(`failed to create user ${email}`);
  await db.insert(userRoles).values({ userId: user.id, role });
  await trustScoreService.ensureInitialized(user.id);

  if (role === "customer") {
    await db.insert(customerProfiles).values({
      userId: user.id,
      firstName: "Layla",
      lastName: "Hassan",
      governorate: "Cairo",
      city: "Nasr City",
      mobileNumber: "01011111111",
    });
  } else if (role === "seller") {
    await db.insert(sellerProfiles).values({
      userId: user.id,
      fullName: "Mostafa Adel",
      phoneNumber: "01022222222",
      importCountries: ["Turkey", "China"],
      productCategories: ["Electronics", "Fashion"],
    });
  } else if (role === "merchant") {
    await db.insert(merchantProfiles).values({
      userId: user.id,
      businessName: "Cairo Ready Stock Co.",
      ownerName: "Nourhan Samir",
      phoneNumber: "01033333333",
      governorate: "Giza",
      city: "6th of October",
      businessCategory: "Electronics & Home",
      importCountry: "China",
    });
  }
  return user;
}

async function main() {
  if (isProd) {
    throw new Error(
      "db:seed refuses to run with NODE_ENV=production — these are publicly-known demo credentials (see LoginPage.tsx's dev quick-login buttons).",
    );
  }

  const [existingAdmin] = await db.select().from(users).where(eq(users.email, "admin@foryou.dev"));
  if (existingAdmin) {
    logger.info("Seed data already present (admin@foryou.dev exists) — skipping.");
    return;
  }

  logger.info("Seeding categories…");
  const electronics = await categoriesService.create({
    nameEn: "Electronics",
    nameAr: "إلكترونيات",
    slug: "electronics",
  });
  await categoriesService.create({
    nameEn: "Mobile Phones",
    nameAr: "هواتف محمولة",
    slug: "mobile-phones",
    parentId: electronics.id,
  });
  await categoriesService.create({
    nameEn: "Laptops & Computers",
    nameAr: "لابتوبات وأجهزة كمبيوتر",
    slug: "laptops-computers",
    parentId: electronics.id,
  });
  const fashion = await categoriesService.create({
    nameEn: "Fashion",
    nameAr: "أزياء",
    slug: "fashion",
  });
  await categoriesService.create({
    nameEn: "Shoes",
    nameAr: "أحذية",
    slug: "shoes",
    parentId: fashion.id,
  });
  await categoriesService.create({
    nameEn: "Bags & Accessories",
    nameAr: "حقائب وإكسسوارات",
    slug: "bags-accessories",
    parentId: fashion.id,
  });
  await categoriesService.create({
    nameEn: "Home & Kitchen",
    nameAr: "المنزل والمطبخ",
    slug: "home-kitchen",
  });

  logger.info("Seeding brands…");
  await brandsService.create({ name: "Apple", slug: "apple" });
  await brandsService.create({ name: "Samsung", slug: "samsung" });
  await brandsService.create({ name: "Nike", slug: "nike" });
  await brandsService.create({ name: "Adidas", slug: "adidas" });
  await brandsService.create({ name: "Zara", slug: "zara" });
  await brandsService.create({ name: "IKEA", slug: "ikea" });

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

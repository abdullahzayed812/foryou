import request from "supertest";
import type { Express } from "express";
import type { Role } from "@foryou/shared";
import { db } from "../db/index.js";
import {
  users,
  userRoles,
  customerProfiles,
  sellerProfiles,
  merchantProfiles,
} from "../modules/users/schema.js";
import { hashPassword } from "../modules/auth/password.js";
import { mediaRepository } from "../modules/media/repository.js";
import type { MediaPurpose } from "@foryou/shared";

/** Test-only shortcut: create an already-verified user directly, skipping the OTP round trip. */
export async function createVerifiedUser(email: string, role: Role = "customer") {
  const passwordHash = await hashPassword("Password123");
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash, emailVerifiedAt: new Date() })
    .returning();
  if (!user) throw new Error("failed to create user");
  await db.insert(userRoles).values({ userId: user.id, role });

  if (role === "customer") {
    await db.insert(customerProfiles).values({
      userId: user.id,
      firstName: "Test",
      lastName: "User",
      governorate: "Cairo",
      city: "Maadi",
    });
  } else if (role === "seller") {
    await db.insert(sellerProfiles).values({
      userId: user.id,
      fullName: "Test Seller",
      phoneNumber: "01000000000",
      importCountries: ["turkey"],
      productCategories: ["General"],
    });
  } else if (role === "merchant") {
    await db.insert(merchantProfiles).values({
      userId: user.id,
      businessName: "Test Business",
      ownerName: "Test Owner",
      phoneNumber: "01000000000",
      governorate: "Cairo",
      city: "Maadi",
      businessCategory: "General",
      importCountry: "turkey",
    });
  }
  return user;
}

export async function loginAs(app: Express, email: string): Promise<string> {
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password: "Password123" });
  if (res.status !== 200) throw new Error(`login failed: ${JSON.stringify(res.body)}`);
  return res.body.accessToken as string;
}

/** Bypasses the real BullMQ worker (a separate process, not spawned by tests) by writing the "processed" outcome directly. */
export async function createReadyMediaAsset(
  uploaderId: string,
  purpose: MediaPurpose = "verification_document",
) {
  const asset = await mediaRepository.create({
    uploaderId,
    kind: "image",
    purpose,
    status: "pending",
    mimeType: "image/jpeg",
    sizeBytes: 1234,
    originalKey: `uploads/test/${crypto.randomUUID()}.jpg`,
  });
  await mediaRepository.markReady(asset.id, {
    processedKey: asset.originalKey,
    width: 100,
    height: 100,
  });
  return asset.id;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

import { randomBytes, randomUUID, createHash } from "node:crypto";

/**
 * Refresh tokens are opaque (not JWTs) — a random string the client stores
 * in an HttpOnly cookie, hashed before it ever touches the database
 * (architecture doc §05). `family` links every token descended from one
 * login so reuse of a revoked token can revoke the whole chain.
 */
export function generateRefreshToken(): { token: string; hash: string; family: string } {
  const token = randomBytes(48).toString("base64url");
  return { token, hash: hashRefreshToken(token), family: randomUUID() };
}

export function rotateRefreshToken(family: string): {
  token: string;
  hash: string;
  family: string;
} {
  const token = randomBytes(48).toString("base64url");
  return { token, hash: hashRefreshToken(token), family };
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

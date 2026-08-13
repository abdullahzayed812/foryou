import jwt from "jsonwebtoken";
import type { Role } from "@foryou/shared";
import { env } from "../../config/env.js";
import { TokenExpiredError, TokenInvalidError } from "../../lib/http-errors.js";

export interface AccessTokenPayload {
  sub: string; // user id
  roles: Role[];
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as unknown as AccessTokenPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) throw new TokenExpiredError();
    throw new TokenInvalidError();
  }
}

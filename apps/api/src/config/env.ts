import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

// Loaded by absolute path (not bare `dotenv/config`) so a single .env at the
// repo root works regardless of the process's cwd — `npm run dev -w apps/api`
// runs with cwd = apps/api, but Docker/production set real env vars directly
// and don't need this file to exist at all.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../../.env"), quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_URL: z.string().url().default("http://localhost:4000"),
  WEB_URL: z.string().url().default("http://localhost:5173"),
  // Extra allowed CORS origins beyond WEB_URL — e.g. testing from another
  // device on the LAN via its IP. WEB_URL stays the single canonical origin
  // used for things like password-reset email links, which can't point at
  // more than one place; this is purely additive for CORS/socket.io.
  CORS_EXTRA_ORIGINS: z.string().optional(),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 chars"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 chars"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),

  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("FOR YOU <no-reply@foryou.local>"),

  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().default("foryou-media"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
  // In prod this is R2's public/CDN domain; in dev it's MinIO's own S3
  // endpoint + bucket, since docker-compose.dev.yml sets the bucket public.
  MEDIA_PUBLIC_BASE_URL: z.string().default("http://localhost:9000/foryou-media"),

  // "mock" simulates Paymob locally (no real credentials needed) so the full
  // deposit → webhook → order-stage-transition flow is developable and
  // testable without a live Paymob account. Swapping to "live" only requires
  // PaymobClient's HTTP calls to target the real API — the rest of the
  // module (webhook handling, idempotency, order/wallet side effects)
  // doesn't change.
  PAYMOB_MODE: z.enum(["mock", "live"]).default("mock"),
  PAYMOB_API_KEY: z.string().optional(),
  PAYMOB_HMAC_SECRET: z.string().default("dev-mock-hmac-secret"),
  PAYMOB_INTEGRATION_ID: z.string().optional(),

  // Optional — error tracking (architecture doc §13) is a no-op until this
  // is set, so every environment works without it (dev/test never set it).
  SENTRY_DSN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

export const allowedOrigins: string[] = [
  env.WEB_URL,
  ...(env.CORS_EXTRA_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? []),
];

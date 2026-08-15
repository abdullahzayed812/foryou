# FOR YOU — Import Marketplace

Egyptian import marketplace: Customers share international shopping carts, Sellers
compete with offers, Merchants list ready-to-ship inventory (FOR YOU EXPRESS).
Built as a **modular monolith** — see `docs/architecture.md`-equivalent design
(the architecture spec this repo implements) for the full system design.

This repo was built **phase by phase**; each phase is a runnable, tested
increment. Current status: **all 16 phases complete** — full backend, all four
role-based frontend dashboards (Customer/Seller/Merchant/Admin), and
production Docker/CI-CD/monitoring, each verified against real infrastructure
end-to-end. See "Build phases" below for what each phase covers and the real
bugs found/fixed while verifying it.

## Stack

React · TypeScript · Vite · Tailwind · TanStack Query · React Hook Form · Zod · Axios
— Node.js · Express 5 · PostgreSQL · Drizzle ORM · Redis · JWT + refresh tokens ·
Socket.IO · BullMQ · Nodemailer — Cloudflare R2 (S3-compatible) — Docker.

## Repo layout

```
apps/
  api/            Express + TypeScript backend (modular monolith)
  web/            React + TypeScript frontend (added Phase 4)
packages/
  shared/         Types/constants shared by api and web (roles, error codes, event contracts)
docker-compose.dev.yml    Local dev infra: Postgres, Redis, MinIO (R2-compatible), Mailhog
docker-compose.prod.yml   Production stack: Postgres, Redis, api, worker, web (Nginx), a one-shot migrate job
apps/api/Dockerfile       Multi-stage prod image — also runs the worker (different CMD, see compose)
apps/web/Dockerfile       Multi-stage prod image — vite build served by Nginx
docker/nginx/web.conf     Nginx config baked into the web image (serves the SPA only)
docker/nginx/edge/        TLS-terminating reverse-proxy Nginx — the `nginx` service in docker-compose.prod.yml
scripts/setup-prod-env.sh Generates .env from .env.production.example with fresh secrets (run on the VPS)
scripts/init-letsencrypt.sh One-time bootstrap for the first real Let's Encrypt certs (run on the VPS)
.github/workflows/        CI (lint/typecheck/test/build) + CD (build & push images to GHCR on main)
```

## Prerequisites

- Node.js ≥ 20, npm ≥ 10
- Docker + Docker Compose

## Getting started

```bash
cp .env.example .env          # defaults already match docker-compose.dev.yml
npm install
npm run dev:infra             # starts Postgres, Redis, MinIO, Mailhog
npm run db:migrate            # applies the schema to the dev database
npm run db:seed               # optional — demo accounts + a starter catalog, see below
npm run dev:api               # starts the API on http://localhost:4000
npm run dev:web               # in another terminal — the app on http://localhost:5173
```

Verify it's alive:

```bash
curl http://localhost:4000/healthz   # {"status":"ok"}
curl http://localhost:4000/readyz    # {"status":"ready","checks":{"database":true,"redis":true}}
```

Dev infra consoles: MinIO at http://localhost:9001 (`foryou-dev` / `foryou-dev-secret`),
Mailhog inbox at http://localhost:8025.

> **Port note:** dev Postgres/Redis are published on **5434**/**6380** (not the
> default 5432/6379), because this environment already had other Postgres/Redis
> instances bound to the standard ports. Containers still talk to each other
> internally on the standard ports — only the host-side mapping differs. If your
> machine is clean, feel free to remap to 5432/6379 in `docker-compose.dev.yml`
> and `.env`.

## Common commands

| Command                                | Does                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `npm run dev:api`                      | Run the API with hot reload (`tsx watch`)                                                               |
| `npm run dev:worker`                   | Run the BullMQ worker process (media processing, etc.) — separate from the API per architecture doc §12 |
| `npm run dev:infra` / `dev:infra:down` | Start/stop Postgres, Redis, MinIO, Mailhog                                                              |
| `npm run typecheck`                    | `tsc --noEmit` across all workspaces                                                                    |
| `npm run lint` / `npm run format`      | ESLint / Prettier across the repo                                                                       |
| `npm test`                             | Vitest (unit + Supertest integration) — needs `dev:infra` running                                       |
| `npm run db:generate`                  | Generate a Drizzle migration from the current schema                                                    |
| `npm run db:migrate`                   | Apply pending migrations                                                                                |
| `npm run db:seed`                      | Seed demo accounts + a starter category/brand catalog (idempotent — skips if already seeded)            |
| `npm run db:reset`                     | **Drops every table** and re-runs migrate + seed — dev only, refuses to run with `NODE_ENV=production`  |
| `npm run db:studio`                    | Open Drizzle Studio against the dev database                                                            |

### Seed data

`npm run db:seed` creates a starter catalog (7 categories, 6 brands) and four
demo accounts, all with password `Password123`:

| Email | Role | Notes |
|---|---|---|
| `admin@foryou.dev` | Admin | full access to `/admin/*` |
| `customer@foryou.dev` | Customer | |
| `seller@foryou.dev` | Seller | not yet verified — submit identity verification via the UI to unlock publishing |
| `merchant@foryou.dev` | Merchant | not yet verified — submit business verification via the UI |

Products and verification aren't seeded yet — both require a real uploaded
image (product cover photo, or ID/business documents) through the Media
module, and object storage isn't configured in every environment. Once R2
(or MinIO in dev) is set up, add product/verification seeding the same way
`src/test/helpers.ts` creates fixtures: call the real service methods
(`productsService.create`, `verificationService.submitIdentity`, …) rather
than inserting rows directly, so seeded data obeys the same business rules
as the real app.

## Deployment & monitoring

Production is a self-hosted Docker stack (`docker-compose.prod.yml`) — swap
`postgres`/`redis` for managed services by pointing `DATABASE_URL`/`REDIS_URL`
at them and dropping those two services; nothing else changes.

`web` and `api` are split across two public subdomains (`foryou.citymarket.tech`,
`api.foryou.citymarket.tech`) rather than sharing one origin, and everything —
including the TLS-terminating reverse proxy — runs as containers; nothing is
installed on the VPS itself beyond Docker. An `nginx` service (`docker/nginx/edge/`)
is the only container bound to the public 80/443 and routes to `web`/`api` by
hostname over the internal Docker network; a `certbot` service shares a volume
with it and renews Let's Encrypt certs every 12h. The browser talks to
`api.foryou.citymarket.tech` directly (`VITE_API_URL`), so CORS (`WEB_URL` →
`allowedOrigins`, `apps/api/src/config/env.ts`) is what keeps that origin
split safe rather than same-origin proxying.

```bash
./scripts/setup-prod-env.sh   # copies .env.production.example → .env, generates
                               # POSTGRES_PASSWORD/JWT secrets — never commit .env
nano .env                     # fill in CERTBOT_EMAIL, the Cloudflare R2 (S3_*)
                               # vars, plus SMTP_*/PAYMOB_*/SENTRY_DSN when ready
docker compose -f docker-compose.prod.yml up -d --build
./scripts/init-letsencrypt.sh  # one-time: issues the first real TLS certs
```

This builds the `api`/`worker` image once (`apps/api/Dockerfile` — same image,
different `command:` per service), runs `migrate` to completion before `api`/
`worker` start (`depends_on: condition: service_completed_successfully`), and
builds `web` (`apps/web/Dockerfile` — a Vite build served by Nginx). Every
long-running service has a Docker `HEALTHCHECK` against `/healthz` (liveness)
or `/readyz` (readiness — checks DB + Redis).

**Redeploying**: `nginx` resolves the `web`/`api` container addresses once at
startup/reload, not per-request, so recreating those containers without also
reloading `nginx` leaves it pointing at their old (now-gone) addresses:

```bash
git pull && docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

**CI/CD** (`.github/workflows/`): `ci.yml` runs lint + typecheck + build on
every push/PR, plus the real Vitest suite against actual Postgres/Redis
service containers (same "no mocked DB" policy as local dev — see Testing
below). `docker-publish.yml` triggers only after `CI` succeeds on `main`, and
builds+pushes both images to GHCR tagged `latest` and the commit SHA, so a
broken build never gets deployed and a specific commit can always be pinned.

**Monitoring**: `pino` logs structured JSON to stdout in production (pretty-printed
in dev only) with a `req.id` correlation id on every request/response line —
ready to ship to any log aggregator (e.g. Loki, CloudWatch) via the container
runtime, no code changes needed. Error tracking is opt-in: set `SENTRY_DSN` and
every 5xx HTTP error and failed BullMQ job is reported with its request id /
job id as context (`src/lib/monitoring.ts`); leave it unset and it's a no-op,
which is why dev/test/CI never set it.

## Architecture at a glance

- **Modular monolith**, not microservices: one Express process, ~20 feature
  modules under `apps/api/src/modules/*`, each owning its own tables
  (Repository Pattern) and exposing a typed service interface to the rest of
  the app. See §02/§14 of the architecture spec for the extraction plan if/when
  a module needs to become its own service.
- **Events**: an in-process typed bus (`src/lib/events.ts`) for read-model side
  effects; anything money- or notification-adjacent goes through a BullMQ queue
  in the same DB transaction as the state change (transactional outbox).
- **Errors**: every thrown error extends `AppError` (`src/lib/http-errors.ts`)
  and is rendered by the central error handler into the stable envelope
  `{ error: { code, message, details? } }` — the frontend switches on `code`,
  never on `message`.
- **Config**: a single Zod-validated `env.ts` fails fast on boot if anything
  required is missing, instead of surfacing as a mysterious runtime error later.

## Build phases

1. ✅ Monorepo scaffold & dev infrastructure
2. ✅ Backend core framework (Express app, DB/Redis clients, error handling, events, health checks)
3. ✅ Auth + Users (registration ×3 roles, email OTP, login, JWT + rotating refresh tokens with theft detection, RBAC, password reset, addresses, multi-role support)
4. ✅ Frontend foundation + Auth UI (Vite/React/Tailwind, i18n with real RTL support, Axios client with refresh rotation, Zustand session store, role-picker + 3 registration forms + OTP + login, all wired to the real API and verified in an actual browser via Playwright)
5. ✅ Verification, Trust Score, Media (R2/S3 pre-signed uploads + a real BullMQ worker that compresses/resizes images with `sharp` and conditionally watermarks — verification docs are never watermarked, only product images will be; identity/business verification submit → admin queue → approve/reject/request-more-docs; trust score ledger with badge-only public API and numeric admin API, initialized automatically off the `user.registered` event)
6. ✅ Categories, Brands, Products (FOR YOU EXPRESS), Search — moderation gate keyed off real verification status (auto-publish for verified accounts, pending review otherwise), status auto-derived from quantity (with an explicit "coming soon" override), 8-image cap with exactly-one-cover/-one-country-of-origin validation, "Notify Me" stock subscriptions, Postgres full-text search + Redis-cached autocomplete. Verified end-to-end including a visual watermark check (product images get the FOR YOU mark, verification docs don't).
7. ✅ Import Requests + Offers — cart-link submission with a best-effort price-hint filter on the notes field, country-based seller matching/distribution, blind competitive offers (fixed 20/30/40/50% deposit tiers, no manual entry), edit-until-selected, one-offer-per-seller-per-request, selecting an offer creates the order (`awaiting_deposit`, 24h deposit deadline) and auto-rejects every other offer. Found and fixed two real bugs while verifying end-to-end: a postgres.js array-literal serialization issue in the country-matching query, and an Express route-shadowing bug where a broader router prefix was silently swallowing a more specific nested route.
8. ✅ Orders + Payments/Deposits + Wallet & Commission — full 7-stage order lifecycle (both Import and EXPRESS checkout share it), a fully-simulated Paymob mock mode so the real webhook signature-verification + idempotency pipeline runs end-to-end without live credentials, wallet ledger with the free-first-month / role-based commission engine, the "new seller" (first 3 orders) vs. verified-24h-timer balance release split, and the deposit-deadline 1st/2nd-strike job. First real production trust-score wiring (order completion/cancellation → point deltas). Found and fixed three real bugs during verification: a wallet-release rule that silently never covered Merchants, a scheduled release job whose stage filter permanently excluded orders that completed before their 24h window elapsed, and an offer-uniqueness constraint that blocked a seller from ever resubmitting on a request that reopened after a missed deposit deadline.
9. ✅ Reviews + Disputes — one review per completed order with a 7-day edit window and Seller/Merchant replies (both architect-recommended durations, since the BRD names the rules without exact numbers); a mandatory post-completion review reminder feed; disputes with the BRD's exact 8-reason list, a 48h-from-delivery open window, required photo evidence via the Media module, a Seller 48h response window, and admin resolution (full/partial refund, replacement, missing-item shipment, or rejection) with dedicated counterfeit-confirmed and false-dispute escalation flags feeding Trust Score. Found and fixed one real bug during verification: `wallet.reverseCredit` always debited the _pending_ balance, but a dispute resolved after an order's on-completion release had already moved that money to _available_ — reversing against the wrong bucket would either under-refund or trip the non-negative balance constraint; fixed by having Disputes check the order's `balanceReleasedAt` flag and reverse from whichever bucket the money actually sits in (both paths now covered by dedicated tests). Reviews and dispute-freeze state share one guard column (`orders.open_dispute_id`) rather than a cross-module dependency in the other direction — Reviews just checks the order it already reads.
10. ✅ Notifications + Wishlist + News & Trends — real Socket.IO push (JWT handshake auth, per-user rooms, Redis adapter for multi-instance fan-out) backed by a persisted/paginated notification list, wired as the first real consumer for ~19 domain events across every earlier module (order lifecycle, offers, disputes, reviews, verification, wallet, product moderation/restock) — most of which had been publishing since their original phase with nobody listening. Found and fixed one real gap while wiring it up: `offer.rejected` was declared in the event map but never actually published — `rejectOthers` silently updated the losing offers' rows without emitting anything, so losing sellers were never notified; fixed by having the repository return the rejected rows and the service publish one `offer.rejected` per seller. Wishlist and admin-authored News & Trends (draft/publish/unpublish) round out the phase — both straightforward CRUD verified end-to-end.
11. ✅ Admin & Platform Settings — admin user directory (filter by role/status/search), suspend/reactivate with a real consequence (login and every sensitive mutating action now actually enforce `requireActiveAccount`, a Phase 3 middleware that had been written but never applied to a single route until now), versioned commission-rate administration, a generic admin-tunable settings store (only wired where it's genuinely load-bearing: `minWithdrawalAmount` in the withdrawal flow and `maintenanceMode` as real platform-wide request gating — not speculative plumbing), and a platform stats dashboard aggregating users/orders/GMV/disputes/wallet/reviews (BRD Rule 8's admin-only dispute statistics, generalized). Found and fixed a second dangling-event gap while wiring notifications for suspend/reactivate: same class of bug as `offer.rejected` in Phase 10. Also hit and fixed a real test-suite bug: vitest's default file-level parallelism let one test's temporary `maintenanceMode` toggle transiently 503 an unrelated concurrently-running test file, since all tests share one real dev database — fixed by disabling file parallelism (`fileParallelism: false`), the correct tradeoff for a suite that deliberately doesn't isolate per-test schemas.
12. ✅ Frontend: Customer dashboard — browse/search/filter with real product images (see backend fix below), wishlist, the full import-request → competing-offers → select → order flow, EXPRESS one-click checkout, deposit payment (Paymob mock-checkout in dev), the delivery timeline, confirm-receipt, reviews (create/edit within the window, seller replies), disputes (evidence upload through the real Media pipeline), a live Socket.IO-backed notification bell, and public News & Trends — all built on the Phase 4 foundation (i18n AR/EN with real RTL, Axios refresh interceptor, Zustand session). Verified with a real Playwright browser run driving the actual UI end-to-end (registration → browse → import request → order → payment → delivery → review → dispute → wishlist → news → Arabic/RTL), not just typecheck/build. That run surfaced four real, fixed bugs: (1) product browse/detail responses only carried `mediaAssetId` per image with no usable URL, forcing an N+1 lookup — fixed by joining each image's media asset and computing a `url` server-side (`withImageUrls` in products/service.ts), now shared by browse, detail, owner, moderation-queue, and search; (2) the wishlist endpoint's nested `product` only pulled the bare row (no `images`/`tags`/`category`/`brand`), crashing `ProductCard` on `product.images.find(...)` — fixed by extending the wishlist repository's relational query and applying the same `withImageUrls` transform; (3) the customer registration form's optional "mobile number" field submitted `""` on an empty input, which `z.string().min(1).optional()` rejects (`""` ≠ "not provided") — fixed at the form layer with react-hook-form's `setValueAs`, the same pattern the seller registration form already used correctly; (4) `requireActiveAccount` (written in Phase 3) had never actually been wired onto any route — now applied to offer submission, import-request creation, product creation, and EXPRESS checkout, verified by suspending a seller mid-flow and confirming a 403.
13. ✅ Frontend: Seller dashboard — identity verification, product management (create/edit with real multi-image upload, cover/country-of-origin flags), the import-request queue (browse/ignore/submit a fixed-tier-deposit offer), My Offers (edit/cancel while active), order fulfillment (manual delivery timeline, cancellation), wallet (balance, withdrawal requests, transaction history), review replies, and dispute responses. Introduced an account-wide role switcher (`active-role-store.ts` + role-keyed nav in `AppLayout`) since one account can hold multiple BRD roles — the seller and customer dashboards now share the same shell and switch nav/home content by active role. Most fulfiller-facing pages (orders, reviews, disputes) were built parameterized by `basePath` specifically so Phase 14's Merchant dashboard can reuse them directly. Verified with a real Playwright run driving the actual seller UI end-to-end (register → submit verification → create a product with a real uploaded image → see a matching import request in the queue → submit an offer → fulfill the resulting order → see the wallet balance and request a withdrawal → reply to a review → respond to a dispute — all through the UI, with only the "other side" of each interaction, i.e. the customer, driven via API). That run found and fixed two real bugs: (1) `useSubmitOffer`/`useEditOffer` passed their whole input object — including the `requestId`/`id` field — straight through as the POST/PATCH body; since the backend's offer schemas are `.strict()`, the extra field made every offer submission and edit fail with `VALIDATION_FAILED`, silently swallowed by the generic error banner. Fixed by destructuring the id out before sending. (2) Two owner-scoped resources — a fulfiller's own order and their own dispute — had list and mutate routes but no single-resource `GET /:id`, so a detail page had no way to fetch just one; added `GET /sellers|merchants/me/orders/:id` and `GET /sellers|merchants/me/disputes/:id` (mirroring the ownership-check pattern already used for owner-scoped products), each with a fresh automated test asserting the owner can fetch it and a different seller gets rejected.
14. ✅ Frontend: Merchant dashboard — business + identity verification, product management, order fulfillment (no cancel control, matching the backend's Seller-only cancel route per BRD Rule 4), wallet, review replies, and dispute responses. Almost entirely composition: every fulfiller-facing page built in Phase 13 (`FulfillerOrdersListPage`, `FulfillerOrderDetailPage`, `FulfillerReviewsPage`, `FulfillerDisputesPage`/`Detail`, `OwnerProductsListPage`/`Form`, `WalletPage`) was deliberately parameterized by `basePath`, so this phase only added a merchant-specific verification page (identity + business, reusing Phase 13's cards) and a `MerchantHome` dashboard widget — no new backend routes were needed since `createOwnerProductsRouter`/`createFulfillerOrdersRouter`/`createFulfillerReviewsRouter`/`createFulfillerDisputesRouter("merchant")` were already mounted from earlier phases. Verified with a real Playwright run driving the full merchant journey end-to-end (register → submit business verification → create a product → EXPRESS-checkout it as a customer → fulfill via the timeline UI → confirm the wallet released the full EXPRESS amount, since merchants have no deposit split → reply to a review → respond to a dispute), including an explicit assertion that no cancel-order button renders for a merchant. Passed cleanly on the first run — the only phase so far with zero bugs found, a direct payoff of Phase 13's parameterization.
15. ✅ Frontend: Admin dashboard — full moderation and platform-ops surface: identity/business verification queue, product moderation queue, dispute resolution (with evidence thumbnails), withdrawal processing, user directory (search/filter/suspend/reactivate), category+brand catalog CRUD, platform settings (maintenance mode, support email, min withdrawal) and versioned commission-rate administration, a platform stats dashboard, and News & Trends authoring (draft/publish/unpublish). Found and fixed a real security bug while wiring up the frontend: `GET /admin/users` returned bare user rows including `passwordHash` straight to the browser — the repository's `listForAdmin()` was never column-scoped; fixed with an explicit safe-columns select and locked in with a permanent regression test asserting no listed user carries a `passwordHash`. Also added the missing `GET /admin/disputes/:id` (needed for the resolution detail page; registered after the literal `/queue`/`/awaiting-review` paths per Express route-matching order) and fixed a stale-cache bug where resolving a dispute via the UI didn't invalidate the individual dispute-detail query key, silently leaving the detail page showing the pre-resolution form. Verified with a real Playwright run driving the full admin journey end-to-end against live fixtures (approve a verification, approve a product, resolve a dispute with a partial refund, process a withdrawal, suspend+reactivate a user with a real login-blocked-403 check, create a category, toggle maintenance mode, set a commission rate, view live stats, publish a news post and confirm it's visible on the real public endpoint), with a hard assertion on zero browser console errors — which caught one more real bug: a React list-rendering key was keyed off a `commissionRules` field (`id`) that only exists on the versioned POST response, not on the `{role, percentage}` shape the GET list endpoint actually returns, causing a duplicate-`undefined`-key warning; fixed by keying on `role` (the real unique identifier for this 2-item list) and splitting the frontend type into a `CommissionRate` (full versioned row) and `CurrentCommissionRate` (GET list shape) instead of overloading one type for two different response shapes.
16. ✅ CI/CD, production Docker, monitoring — multi-stage production Dockerfiles for `api` (also serves as the `worker` image, differing only by `command:`) and `web` (Vite build served by Nginx, reverse-proxying `/api/v1` + `/socket.io` to `api`), a self-hosted `docker-compose.prod.yml` stack (Postgres, Redis, api, worker, web, a one-shot `migrate` job gating api/worker startup), GitHub Actions CI (lint/typecheck/build + the real Vitest suite against actual Postgres/Redis service containers) and CD (build+push both images to GHCR, gated on CI passing on `main`), and opt-in Sentry error tracking (`SENTRY_DSN`, no-op unless set) wired into the HTTP error handler and the shared BullMQ worker's `failed` handler — on top of the structured JSON `pino` logging and `/healthz`/`/readyz` probes already built in earlier phases. Verified by actually building both images and running the full production compose stack end-to-end (not just `docker build`) — migration job, API, worker, and Nginx-fronted web all confirmed healthy against real containers, with the web container's reverse proxy to the API confirmed live. That run found and fixed two real bugs: (1) the API image never copied `apps/api/drizzle` (the migration SQL files) into the runtime stage, so the `migrate` service crashed with "Can't find meta/_journal.json file"; (2) even after copying it, drizzle-orm's migrator resolves `migrationsFolder` relative to the process's cwd, not relative to `migrate.js` itself — since the container's `WORKDIR` was the repo root, not `apps/api`, "./drizzle" still didn't resolve; fixed by moving `WORKDIR` to `apps/api` in the runtime stage (Node's module resolution still walks up to the shared `/app/node_modules`, so this doesn't break any import) and updating the compose `command:`s to match.

## Testing

Integration tests (`*.test.ts`, Vitest + Supertest) run against the real dev
Postgres/Redis started by `npm run dev:infra` — there's no mocked-DB test mode,
by design: the tables and constraints are part of what's under test.

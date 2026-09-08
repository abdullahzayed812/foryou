# FOR YOU WANTED → EXPRESS product lifecycle

Implementation report.

## Inspection summary

| Concern | What already exists | How it was reused |
|---|---|---|
| Product lifecycle | None on the product. `products.status` (`available/low_stock/out_of_stock/coming_soon`) is stock-derived via `deriveProductStatus()` in `@foryou/shared`. `coming_soon` = manual "not buyable" flag (Orders blocks checkout on it). | Added a **separate** `products.lifecycle` column; "OUT OF STOCK" stays a derived state, no new status value. |
| "FOR YOU WANTED" today | `import_requests` — an unrelated customer-RFQ/offers marketplace. Landing page marketing section only. | Left untouched; built the product-lifecycle WANTED as a new concept. |
| Inventory | `products.availableQuantity`, decremented in `OrdersService.markPaid`. | `completeImport` adds imported qty to it; `deriveProductStatus` recomputes status. |
| "Like" | `wishlist_items` (general, always-on wishlist). | Left as-is; WANTED ❤️ is its own cycle-scoped table (spec §2 "keep separate", §6 "reset to 0"). |
| "Notify me" | `stock_notifications` + `product.stock.restocked` event = EXPRESS back-in-stock. | Left as-is; WANTED 🔔 is a distinct cycle-scoped table (spec §8). |
| Notifications | `eventBus` + `notifications` table + `notificationsService.notify()` + Socket.IO `emitToUser`; consumers in `notifications/event-subscribers.ts`. | Added one enum value + one subscriber. |
| Seller/Merchant dashboards | `createOwnerProductsRouter(role)` at `/sellers\|merchants/me/products`; web pages parameterized by `basePath`. | Added routes to the same router; added a panel to the existing product form page. |
| Admin | `productsAdminRouter` (queue/approve/reject/hide); `AdminProductsQueuePage`. | Added a lifecycle badge + one admin analytics endpoint, same `requireRole("admin")`. |

---

## 1. Files changed

**New**

- `apps/api/src/modules/wanted/{schema,repository,service,events,wanted.test}.ts`
- `apps/api/drizzle/0010_exotic_banshee.sql` (+ `meta/0010_snapshot.json`, `_journal.json`)
- `packages/shared/src/validation/wanted.ts`
- `apps/web/src/features/catalog/WantedPanel.tsx`
- `apps/web/src/features/owner-products/OwnerWantedPanel.tsx`

**Modified**

- API: `db/schema/index.ts`, `modules/products/{schema,service,routes}.ts`, `modules/notifications/{schema,event-subscribers}.ts`
- shared: `src/index.ts`, `src/validation/products.ts` (added `startAsWanted`)
- web: `features/catalog/{types,api,hooks,ProductCard}.ts(x)`, `catalog/pages/ProductDetailPage.tsx`, `features/owner-products/{api,hooks}.ts` + `pages/{OwnerProductFormPage,OwnerProductsListPage}.tsx`, `features/admin/{api.ts,pages/AdminProductsQueuePage.tsx}`, `locales/{en,ar}.json`

## 2. Database changes (migration `0010`, already applied to the dev DB)

- `products.lifecycle` — new enum `product_lifecycle` (`wanted|importing|express`), `NOT NULL DEFAULT 'express'` (existing rows backfill to `express`).
- `wanted_cycles` — `id, product_id (FK→products, cascade), cycle_number, status (wanted_cycle_status: active|importing|completed), imported_quantity, created_at, importing_at, completed_at`. Unique `(product_id, cycle_number)`; **partial unique** `(product_id) WHERE status <> 'completed'` (one open cycle per product).
- `wanted_likes` — `id, wanted_cycle_id (FK, cascade), customer_id (FK), created_at`; unique `(wanted_cycle_id, customer_id)`.
- `wanted_notify_requests` — same + `notified_at` (per-cycle dedupe guard); unique `(wanted_cycle_id, customer_id)`.
- `notification_type` enum: new value `product_wanted_available`.

No existing table dropped/renamed. Interaction rows are **never deleted** on transition — history is preserved (spec §3, §18).

## 3. API changes (all on existing routers, existing auth middleware)

Customer (`/products`):

- `GET /products/:id/wanted` (optional auth) → `{ lifecycle, cycle | null, viewerLiked, viewerNotified }`
- `POST|DELETE /products/:id/wanted/like` (customer)
- `POST|DELETE /products/:id/wanted/notify` (customer)

Owner (`/sellers/me/products`, `/merchants/me/products`):

- `POST /:id/wanted/start` — open a WANTED cycle (also cycle #2+)
- `POST /:id/wanted/importing` — WANTED → IMPORTING
- `POST /:id/wanted/complete-import` `{ importedQuantity }` — IMPORTING → EXPRESS + add stock
- `GET /:id/wanted/cycles` — full analytics history
- `GET /wanted/dashboard` — this account's products currently in a WANTED cycle

Admin (`/admin/products`):

- `GET /admin/products/:id/wanted/cycles` — same analytics for oversight

Existing `POST /sellers|merchants/me/products` now accepts `startAsWanted: boolean` (defaults false) to list a brand-new product straight into cycle #1. No existing endpoint changed shape (only the additive `lifecycle` field now appears on product responses, which it already did via `findById`).

## 4. UI changes

- **ProductCard / ProductDetailPage**: WANTED/Importing badge instead of stock badge when `lifecycle !== 'express'`. Detail page renders `WantedPanel` (❤️ Like + 🔔 Notify Me toggles with live counts, frozen during IMPORTING) in place of the buy box. EXPRESS is unchanged — Add to Cart / Buy Now, no WANTED counters shown.
- **Owner product form** (`OwnerWantedPanel`): lifecycle badge, transition buttons (Start WANTED / Start Importing / Complete import + qty), and a per-cycle analytics table — ❤️ likes, 🔔 notify, 📦 imported, 🛒 sold, 📦 remaining, notify→purchase %, status. "List as WANTED" checkbox on the create form.
- **Owner product list**: lifecycle badge per card.
- **Admin products queue**: lifecycle badge per row; `adminProductsApi.wantedCycles(id)` available.
- i18n: `wanted.*` keys added to `en.json` + `ar.json`.

## 5. Lifecycle behavior

`startWanted`/`startWantedForNewProduct` → creates cycle #N (`active`), sets `lifecycle='wanted'`, `status='coming_soon'`, `availableQuantity=0` (quantity is meaningless until import, spec §5). Only allowed from `express` with no open cycle. → `startImporting` (owner) → cycle `importing`, `lifecycle='importing'`; ❤️/🔔 now return 409. → `completeImport` (owner) → `availableQuantity += importedQuantity`, `lifecycle='express'`, `status` re-derived, cycle → `completed` with `imported_quantity`/`completed_at`. EXPRESS stock hitting 0 → existing path sets `status='out_of_stock'`, `lifecycle` stays `express` = "OUT OF STOCK". Product id is stable throughout. Owner-only guard on every transition (403 otherwise). PATCHing a WANTED/importing product can't make it buyable (status forced to `coming_soon` until EXPRESS).

## 6. Notification behavior

`completeImport` publishes `wanted.cycle.completed`. The Notifications subscriber loads `wanted_notify_requests WHERE notified_at IS NULL` for that cycle, marks them notified, and sends one `product_wanted_available` notification each — body: `"المنتج اللي كنت مهتم بيه بقى متوفر على FOR YOU EXPRESS 🎉"` — through the existing `notificationsService.notify()` (persisted + Socket.IO push). Dedupe is guaranteed by `notified_at` + the `(cycle, customer)` unique constraint, so re-firing the event notifies nobody twice. ❤️-only customers are not notified. EXPRESS back-in-stock (`stock_notifications`) is completely untouched and independent.

## 7. Analytics behavior

`getCycleAnalytics` returns every cycle (oldest first). Per cycle: `likes`/`notifyRequests` counted from the cycle-scoped tables; `importedQuantity` from the cycle row; `unitsSold` = Σ`quantity` of real `orders` (`type='express'`, stages `deposit_paid|processing|delivered|completed`) for that product in the window `[completedAt, nextCycle.completedAt)`; `remainingStock` = current `availableQuantity` for the live EXPRESS cycle, else `imported − sold` (clamped ≥ 0); `notifyToPurchase` = of that cycle's 🔔 requesters, how many placed such an order, as `{notified, purchased, rate}`. Open cycles report `null` for sold/remaining/conversion.

## 8. Tests added

`apps/api/src/modules/wanted/wanted.test.ts` (4 tests, all green; full suite 88/88):

1. Full cycle — create-as-WANTED → 2 likes + 1 notify counted separately → not purchasable (409) → IMPORTING freezes interactions (409) → complete-import adds 60 stock, flips to EXPRESS, **same product id**, EXPRESS view shows `cycle: null`, 🔔 requester notified exactly once, ❤️-only user not notified.
2. Analytics from real paid orders (`unitsSold`, `remainingStock`, `notifyToPurchase = 1/1`) + cycle #2 opens without mutating cycle #1.
3. Non-owner gets 403 on transitions.
4. A normal EXPRESS product exposes no WANTED cycle.

`typecheck`, `lint` (no new issues — 7 pre-existing failures in untouched files), and both app builds pass.

## 9. Assumptions & limitations

- **Conversion is computable** (spec §10): both `wanted_notify_requests` and `orders` carry `customerId`, so notify→purchase is derived by matching that id within the post-completion window — no fabricated data. Assumption: any paid EXPRESS order by a notify-requester for that product in the window counts as a conversion (there is no explicit order↔notification FK; a customer buying for an unrelated reason would still count).
- Opening a WANTED cycle resets `availableQuantity` to 0. For cycle #2 the product has normally already sold out; a seller opening a cycle while stock remains would lose that count as *live* stock (still reconstructable per old cycle as `imported − sold`).
- Lifecycle transitions are **manual** (seller-triggered). "IMPORTING" doesn't auto-advance — no scheduled job was added (would be over-engineering per the brief).
- Admin surface is a lifecycle badge on the moderation queue + the `GET /admin/products/:id/wanted/cycles` endpoint; there's no admin "all products" list page in the codebase, so no new dashboard was built (spec §14/§15 — "where appropriate", reuse existing).
- The migration was generated and applied to the local dev DB; deploy needs `npm run db:migrate`. The `ALTER TYPE … ADD VALUE` statement requires PostgreSQL ≥ 12.

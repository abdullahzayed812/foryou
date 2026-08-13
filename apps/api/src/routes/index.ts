import { Router } from "express";
import { authRouter } from "../modules/auth/routes.js";
import { usersRouter, usersAdminRouter } from "../modules/users/routes.js";
import { mediaRouter } from "../modules/media/routes.js";
import { verificationRouter, verificationAdminRouter } from "../modules/verification/routes.js";
import { trustScoreRouter, trustScoreAdminRouter } from "../modules/trust-score/routes.js";
import { categoriesRouter, categoriesAdminRouter } from "../modules/categories/routes.js";
import { brandsRouter, brandsAdminRouter } from "../modules/brands/routes.js";
import {
  productsRouter,
  productsAdminRouter,
  createOwnerProductsRouter,
} from "../modules/products/routes.js";
import { searchRouter } from "../modules/search/routes.js";
import {
  importRequestsRouter,
  sellerImportRequestsRouter,
} from "../modules/import-requests/routes.js";
import { offersByRequestRouter, offersRouter } from "../modules/offers/routes.js";
import { ordersRouter, createFulfillerOrdersRouter } from "../modules/orders/routes.js";
import {
  walletRouter,
  withdrawalsAdminRouter,
  commissionRatesAdminRouter,
} from "../modules/wallet/routes.js";
import {
  depositPaymentRouter,
  paymobWebhookRouter,
  mockCheckoutRouter,
  isMockPaymentsEnabled,
} from "../modules/payments/routes.js";
import {
  reviewsRouter,
  createFulfillerReviewsRouter,
  reviewsAdminRouter,
} from "../modules/reviews/routes.js";
import {
  disputesRouter,
  createFulfillerDisputesRouter,
  disputesAdminRouter,
} from "../modules/disputes/routes.js";
import { notificationsRouter } from "../modules/notifications/routes.js";
import { wishlistRouter } from "../modules/wishlist/routes.js";
import { newsRouter, newsAdminRouter } from "../modules/news/routes.js";
import { settingsRouter, settingsAdminRouter } from "../modules/settings/routes.js";
import { adminStatsRouter } from "../modules/admin/routes.js";

/**
 * Composition root for `/api/v1`. Each module (architecture doc §02) mounts
 * its router here as it's built.
 */
export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/users/me/trust", trustScoreRouter);
apiRouter.use("/media", mediaRouter);
apiRouter.use("/verification", verificationRouter);
apiRouter.use("/admin/verification", verificationAdminRouter);
apiRouter.use("/admin/users", usersAdminRouter);
apiRouter.use("/admin/users", trustScoreAdminRouter);
apiRouter.use("/categories", categoriesRouter);
apiRouter.use("/admin/categories", categoriesAdminRouter);
apiRouter.use("/brands", brandsRouter);
apiRouter.use("/admin/brands", brandsAdminRouter);
apiRouter.use("/products", productsRouter);
apiRouter.use("/admin/products", productsAdminRouter);
apiRouter.use("/sellers/me/products", createOwnerProductsRouter("seller"));
apiRouter.use("/merchants/me/products", createOwnerProductsRouter("merchant"));
apiRouter.use("/search", searchRouter);
// More specific path mounted first — defense-in-depth alongside the
// per-route guards in import-requests/routes.ts (see the comment there).
apiRouter.use("/import-requests/:requestId/offers", offersByRequestRouter);
apiRouter.use("/import-requests", importRequestsRouter);
apiRouter.use("/sellers/me/import-requests", sellerImportRequestsRouter);
apiRouter.use("/offers", offersRouter);
apiRouter.use("/orders/:id/deposit", depositPaymentRouter);
apiRouter.use("/orders", ordersRouter);
apiRouter.use("/sellers/me/orders", createFulfillerOrdersRouter("seller"));
apiRouter.use("/merchants/me/orders", createFulfillerOrdersRouter("merchant"));
apiRouter.use("/wallet", walletRouter);
apiRouter.use("/admin/withdrawals", withdrawalsAdminRouter);
apiRouter.use("/admin/commission-rates", commissionRatesAdminRouter);
apiRouter.use("/webhooks", paymobWebhookRouter);
if (isMockPaymentsEnabled()) {
  apiRouter.use("/dev", mockCheckoutRouter);
}
apiRouter.use("/reviews", reviewsRouter);
apiRouter.use("/sellers/me/reviews", createFulfillerReviewsRouter("seller"));
apiRouter.use("/merchants/me/reviews", createFulfillerReviewsRouter("merchant"));
apiRouter.use("/admin/reviews", reviewsAdminRouter);
apiRouter.use("/disputes", disputesRouter);
apiRouter.use("/sellers/me/disputes", createFulfillerDisputesRouter("seller"));
apiRouter.use("/merchants/me/disputes", createFulfillerDisputesRouter("merchant"));
apiRouter.use("/admin/disputes", disputesAdminRouter);
apiRouter.use("/notifications", notificationsRouter);
apiRouter.use("/wishlist", wishlistRouter);
apiRouter.use("/news", newsRouter);
apiRouter.use("/admin/news", newsAdminRouter);
apiRouter.use("/settings", settingsRouter);
apiRouter.use("/admin/settings", settingsAdminRouter);
apiRouter.use("/admin/stats", adminStatsRouter);

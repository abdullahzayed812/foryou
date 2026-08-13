import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthLayout } from "@/layouts/AuthLayout";
import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleRoute } from "./RoleRoute";
import { ChooseRolePage } from "@/features/auth/pages/ChooseRolePage";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterCustomerPage } from "@/features/auth/pages/RegisterCustomerPage";
import { RegisterSellerPage } from "@/features/auth/pages/RegisterSellerPage";
import { RegisterMerchantPage } from "@/features/auth/pages/RegisterMerchantPage";
import { VerifyOtpPage } from "@/features/auth/pages/VerifyOtpPage";
import { DashboardPage } from "@/features/auth/pages/DashboardPage";
import { BrowsePage } from "@/features/catalog/pages/BrowsePage";
import { ProductDetailPage } from "@/features/catalog/pages/ProductDetailPage";
import { CreateImportRequestPage } from "@/features/import-requests/pages/CreateImportRequestPage";
import { ImportRequestsListPage } from "@/features/import-requests/pages/ImportRequestsListPage";
import { ImportRequestDetailPage } from "@/features/import-requests/pages/ImportRequestDetailPage";
import { SellerQueuePage } from "@/features/import-requests/pages/SellerQueuePage";
import { SellerImportRequestDetailPage } from "@/features/import-requests/pages/SellerImportRequestDetailPage";
import { MyOffersPage } from "@/features/import-requests/pages/MyOffersPage";
import { OrdersListPage } from "@/features/orders/pages/OrdersListPage";
import { OrderDetailPage } from "@/features/orders/pages/OrderDetailPage";
import { FulfillerOrdersListPage } from "@/features/orders/pages/FulfillerOrdersListPage";
import { FulfillerOrderDetailPage } from "@/features/orders/pages/FulfillerOrderDetailPage";
import { OpenDisputePage } from "@/features/disputes/pages/OpenDisputePage";
import { DisputesListPage } from "@/features/disputes/pages/DisputesListPage";
import { DisputeDetailPage } from "@/features/disputes/pages/DisputeDetailPage";
import { FulfillerDisputesPage } from "@/features/disputes/pages/FulfillerDisputesPage";
import { FulfillerDisputeDetailPage } from "@/features/disputes/pages/FulfillerDisputeDetailPage";
import { FulfillerReviewsPage } from "@/features/reviews/pages/FulfillerReviewsPage";
import { CustomerReviewsPage } from "@/features/reviews/pages/CustomerReviewsPage";
import { WishlistPage } from "@/features/wishlist/pages/WishlistPage";
import { NotificationsPage } from "@/features/notifications/pages/NotificationsPage";
import { NewsListPage } from "@/features/news/pages/NewsListPage";
import { NewsDetailPage } from "@/features/news/pages/NewsDetailPage";
import { SellerVerificationPage } from "@/features/verification/pages/SellerVerificationPage";
import { MerchantVerificationPage } from "@/features/verification/pages/MerchantVerificationPage";
import { OwnerProductsListPage } from "@/features/owner-products/pages/OwnerProductsListPage";
import { OwnerProductFormPage } from "@/features/owner-products/pages/OwnerProductFormPage";
import { WalletPage } from "@/features/wallet/pages/WalletPage";
import { AdminVerificationQueuePage } from "@/features/admin/pages/AdminVerificationQueuePage";
import { AdminProductsQueuePage } from "@/features/admin/pages/AdminProductsQueuePage";
import { AdminDisputesQueuePage } from "@/features/admin/pages/AdminDisputesQueuePage";
import { AdminDisputeDetailPage } from "@/features/admin/pages/AdminDisputeDetailPage";
import { AdminWithdrawalsPage } from "@/features/admin/pages/AdminWithdrawalsPage";
import { AdminUsersListPage } from "@/features/admin/pages/AdminUsersListPage";
import { AdminUserDetailPage } from "@/features/admin/pages/AdminUserDetailPage";
import { AdminCatalogPage } from "@/features/admin/pages/AdminCatalogPage";
import { AdminSettingsPage } from "@/features/admin/pages/AdminSettingsPage";
import { AdminStatsPage } from "@/features/admin/pages/AdminStatsPage";
import { AdminNewsPage } from "@/features/admin/pages/AdminNewsPage";
import { AdminReviewsPage } from "@/features/admin/pages/AdminReviewsPage";
import { LandingPage } from "@/features/marketing/pages/LandingPage";
import { ProfilePage } from "@/features/auth/pages/ProfilePage";

export const router = createBrowserRouter([
  // Public marketing page — full-bleed, so it sits outside AuthLayout's
  // centered max-w-md shell rather than inside it.
  { path: "/", element: <LandingPage /> },
  {
    element: <AuthLayout />,
    children: [
      { path: "/register", element: <ChooseRolePage /> },
      { path: "/register/customer", element: <RegisterCustomerPage /> },
      { path: "/register/seller", element: <RegisterSellerPage /> },
      { path: "/register/merchant", element: <RegisterMerchantPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/verify-otp", element: <VerifyOtpPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/products", element: <BrowsePage /> },
          { path: "/products/:id", element: <ProductDetailPage /> },
          { path: "/profile", element: <ProfilePage /> },
          { path: "/notifications", element: <NotificationsPage /> },
          { path: "/news", element: <NewsListPage /> },
          { path: "/news/:id", element: <NewsDetailPage /> },

          // ---- customer ----
          {
            element: <RoleRoute roles={["customer"]} />,
            children: [
              { path: "/import-requests", element: <ImportRequestsListPage /> },
              { path: "/import-requests/new", element: <CreateImportRequestPage /> },
              { path: "/import-requests/:id", element: <ImportRequestDetailPage /> },
              { path: "/orders", element: <OrdersListPage /> },
              { path: "/orders/:id", element: <OrderDetailPage /> },
              { path: "/orders/:orderId/dispute", element: <OpenDisputePage /> },
              { path: "/disputes", element: <DisputesListPage /> },
              { path: "/disputes/:id", element: <DisputeDetailPage /> },
              { path: "/wishlist", element: <WishlistPage /> },
              { path: "/reviews", element: <CustomerReviewsPage /> },
            ],
          },

          // ---- seller ----
          {
            element: <RoleRoute roles={["seller"]} />,
            children: [
              { path: "/sellers/me/verification", element: <SellerVerificationPage /> },
              {
                path: "/sellers/me/products",
                element: (
                  <OwnerProductsListPage
                    basePath="/sellers/me/products"
                    editBase="/sellers/me/products"
                  />
                ),
              },
              {
                path: "/sellers/me/products/:id",
                element: (
                  <OwnerProductFormPage
                    basePath="/sellers/me/products"
                    listPath="/sellers/me/products"
                  />
                ),
              },
              { path: "/sellers/me/import-requests", element: <SellerQueuePage /> },
              {
                path: "/sellers/me/import-requests/:id",
                element: <SellerImportRequestDetailPage />,
              },
              { path: "/sellers/me/offers", element: <MyOffersPage /> },
              {
                path: "/sellers/me/orders",
                element: (
                  <FulfillerOrdersListPage
                    basePath="/sellers/me/orders"
                    detailBase="/sellers/me/orders"
                  />
                ),
              },
              {
                path: "/sellers/me/orders/:id",
                element: <FulfillerOrderDetailPage basePath="/sellers/me/orders" canCancel />,
              },
              { path: "/sellers/me/wallet", element: <WalletPage /> },
              {
                path: "/sellers/me/reviews",
                element: <FulfillerReviewsPage basePath="/sellers/me/reviews" />,
              },
              {
                path: "/sellers/me/disputes",
                element: (
                  <FulfillerDisputesPage
                    basePath="/sellers/me/disputes"
                    detailBase="/sellers/me/disputes"
                  />
                ),
              },
              {
                path: "/sellers/me/disputes/:id",
                element: <FulfillerDisputeDetailPage basePath="/sellers/me/disputes" />,
              },
            ],
          },

          // ---- merchant ----
          {
            element: <RoleRoute roles={["merchant"]} />,
            children: [
              { path: "/merchants/me/verification", element: <MerchantVerificationPage /> },
              {
                path: "/merchants/me/products",
                element: (
                  <OwnerProductsListPage
                    basePath="/merchants/me/products"
                    editBase="/merchants/me/products"
                  />
                ),
              },
              {
                path: "/merchants/me/products/:id",
                element: (
                  <OwnerProductFormPage
                    basePath="/merchants/me/products"
                    listPath="/merchants/me/products"
                  />
                ),
              },
              {
                path: "/merchants/me/orders",
                element: (
                  <FulfillerOrdersListPage
                    basePath="/merchants/me/orders"
                    detailBase="/merchants/me/orders"
                  />
                ),
              },
              {
                path: "/merchants/me/orders/:id",
                element: (
                  <FulfillerOrderDetailPage basePath="/merchants/me/orders" canCancel={false} />
                ),
              },
              { path: "/merchants/me/wallet", element: <WalletPage /> },
              {
                path: "/merchants/me/reviews",
                element: <FulfillerReviewsPage basePath="/merchants/me/reviews" />,
              },
              {
                path: "/merchants/me/disputes",
                element: (
                  <FulfillerDisputesPage
                    basePath="/merchants/me/disputes"
                    detailBase="/merchants/me/disputes"
                  />
                ),
              },
              {
                path: "/merchants/me/disputes/:id",
                element: <FulfillerDisputeDetailPage basePath="/merchants/me/disputes" />,
              },
            ],
          },

          // ---- admin ----
          {
            element: <RoleRoute roles={["admin"]} />,
            children: [
              { path: "/admin/verification-queue", element: <AdminVerificationQueuePage /> },
              { path: "/admin/products-queue", element: <AdminProductsQueuePage /> },
              { path: "/admin/disputes-queue", element: <AdminDisputesQueuePage /> },
              { path: "/admin/disputes/:id", element: <AdminDisputeDetailPage /> },
              { path: "/admin/reviews", element: <AdminReviewsPage /> },
              { path: "/admin/withdrawals", element: <AdminWithdrawalsPage /> },
              { path: "/admin/users", element: <AdminUsersListPage /> },
              { path: "/admin/users/:id", element: <AdminUserDetailPage /> },
              { path: "/admin/catalog", element: <AdminCatalogPage /> },
              { path: "/admin/settings", element: <AdminSettingsPage /> },
              { path: "/admin/stats", element: <AdminStatsPage /> },
              { path: "/admin/news", element: <AdminNewsPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

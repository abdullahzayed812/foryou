import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import {
  OrdersIcon,
  WalletIcon,
  HeartIcon,
  InboxIcon,
  BoxIcon,
  StarIcon,
  ClockIcon,
  UsersIcon,
  AlertIcon,
  CoinIcon,
} from "@/components/ui/icons";
import { useMe, useMyTrustBadge } from "@/features/auth/hooks";
import { useActiveRoleStore } from "@/features/auth/active-role-store";
import { usePendingReviews } from "@/features/reviews/hooks";
import { useMyWallet } from "@/features/wallet/hooks";
import { useSellerOpenRequests } from "@/features/import-requests/hooks";
import { useMyOrders, useFulfillerOrders } from "@/features/orders/hooks";
import { useWishlist } from "@/features/wishlist/hooks";
import { useOwnerProductsList } from "@/features/owner-products/hooks";
import { useAdminPlatformStats } from "@/features/admin/hooks";
import type { Order, OrderStage } from "@/features/orders/types";

const TRUST_TONE = {
  excellent: "success",
  good: "brand",
  average: "neutral",
  low: "warning",
} as const;

const ORDER_STATUS_TONE: Record<OrderStage, "warning" | "brand" | "success" | "danger"> = {
  awaiting_deposit: "warning",
  deposit_paid: "brand",
  processing: "brand",
  delivered: "warning",
  completed: "success",
  cancelled: "danger",
};

const ACTIVE_STAGES: OrderStage[] = ["awaiting_deposit", "deposit_paid", "processing", "delivered"];

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to}>
      <Card className="p-4 text-center transition-shadow hover:shadow-md">{label}</Card>
    </Link>
  );
}

function RecentOrders({ orders, basePath }: { orders: Order[]; basePath: string }) {
  const { t } = useTranslation();
  const recent = orders.slice(0, 3);
  if (recent.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-neutral-900">{t("dashboard.recentOrders")}</h2>
      <div className="flex flex-col gap-2">
        {recent.map((order) => (
          <Link
            key={order.id}
            to={`${basePath}/${order.id}`}
            className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-neutral-50"
          >
            <span className="text-sm text-neutral-700">
              {Number(order.totalAmount).toFixed(2)} {t("common.egp")}
            </span>
            <Badge tone={ORDER_STATUS_TONE[order.stage]}>{t(`orderStage.${order.stage}`)}</Badge>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function CustomerHome() {
  const { t } = useTranslation();
  const { data: pending } = usePendingReviews();
  const { data: orders } = useMyOrders();
  const { data: wishlist } = useWishlist();

  const activeOrders = orders?.filter((o) => ACTIVE_STAGES.includes(o.stage)).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<OrdersIcon />}
          label={t("dashboard.stats.activeOrders")}
          value={activeOrders}
        />
        <StatCard
          icon={<HeartIcon />}
          label={t("dashboard.stats.wishlist")}
          value={wishlist?.length ?? 0}
          tone="danger"
        />
        <StatCard
          icon={<ClockIcon />}
          label={t("dashboard.stats.pendingReviews")}
          value={pending?.length ?? 0}
          tone="warning"
        />
        <StatCard
          icon={<BoxIcon />}
          label={t("dashboard.stats.totalOrders")}
          value={orders?.length ?? 0}
          tone="neutral"
        />
      </div>

      {orders && <RecentOrders orders={orders} basePath="/orders" />}

      {pending && pending.length > 0 && (
        <Card className="border-brand-200 bg-brand-50">
          <p className="text-sm font-medium text-brand-900">
            {t("dashboard.pendingReviews", { count: pending.length })}
          </p>
          <Link to="/orders">
            <Button variant="ghost" className="mt-2" fullWidth={false}>
              {t("dashboard.viewOrders")}
            </Button>
          </Link>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLink to="/products" label={t("nav.browse")} />
        <QuickLink to="/import-requests/new" label={t("dashboard.newRequest")} />
        <QuickLink to="/orders" label={t("nav.orders")} />
        <QuickLink to="/wishlist" label={t("nav.wishlist")} />
      </div>
    </div>
  );
}

function SellerHome() {
  const { t } = useTranslation();
  const { data: wallet } = useMyWallet();
  const { data: openRequests } = useSellerOpenRequests();
  const { data: orders } = useFulfillerOrders("/sellers/me/orders");

  const activeOrders = orders?.filter((o) => ACTIVE_STAGES.includes(o.stage)).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<WalletIcon />}
          label={t("wallet.available")}
          value={`${Number(wallet?.availableBalance ?? 0).toFixed(2)} ${t("common.egp")}`}
          tone="success"
        />
        <StatCard
          icon={<CoinIcon />}
          label={t("wallet.pending")}
          value={`${Number(wallet?.pendingBalance ?? 0).toFixed(2)} ${t("common.egp")}`}
          tone="warning"
        />
        <StatCard
          icon={<InboxIcon />}
          label={t("dashboard.stats.openRequests")}
          value={openRequests?.length ?? 0}
        />
        <StatCard
          icon={<OrdersIcon />}
          label={t("dashboard.stats.activeOrders")}
          value={activeOrders}
          tone="neutral"
        />
      </div>

      {orders && <RecentOrders orders={orders} basePath="/sellers/me/orders" />}

      {openRequests && openRequests.length > 0 && (
        <Card className="border-brand-200 bg-brand-50">
          <p className="text-sm font-medium text-brand-900">
            {t("dashboard.openRequests", { count: openRequests.length })}
          </p>
          <Link to="/sellers/me/import-requests">
            <Button variant="ghost" className="mt-2" fullWidth={false}>
              {t("nav.requestQueue")}
            </Button>
          </Link>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLink to="/sellers/me/products/new" label={t("ownerProducts.list.create")} />
        <QuickLink to="/sellers/me/import-requests" label={t("nav.requestQueue")} />
        <QuickLink to="/sellers/me/orders" label={t("nav.orders")} />
        <QuickLink to="/sellers/me/wallet" label={t("nav.wallet")} />
      </div>
    </div>
  );
}

function MerchantHome() {
  const { t } = useTranslation();
  const { data: wallet } = useMyWallet();
  const { data: orders } = useFulfillerOrders("/merchants/me/orders");
  const { data: products } = useOwnerProductsList("/merchants/me/products");

  const activeOrders = orders?.filter((o) => ACTIVE_STAGES.includes(o.stage)).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<WalletIcon />}
          label={t("wallet.available")}
          value={`${Number(wallet?.availableBalance ?? 0).toFixed(2)} ${t("common.egp")}`}
          tone="success"
        />
        <StatCard
          icon={<CoinIcon />}
          label={t("wallet.pending")}
          value={`${Number(wallet?.pendingBalance ?? 0).toFixed(2)} ${t("common.egp")}`}
          tone="warning"
        />
        <StatCard
          icon={<OrdersIcon />}
          label={t("dashboard.stats.activeOrders")}
          value={activeOrders}
        />
        <StatCard
          icon={<BoxIcon />}
          label={t("dashboard.stats.products")}
          value={products?.length ?? 0}
          tone="neutral"
        />
      </div>

      {orders && <RecentOrders orders={orders} basePath="/merchants/me/orders" />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLink to="/merchants/me/products/new" label={t("ownerProducts.list.create")} />
        <QuickLink to="/merchants/me/orders" label={t("nav.orders")} />
        <QuickLink to="/merchants/me/wallet" label={t("nav.wallet")} />
        <QuickLink to="/merchants/me/reviews" label={t("nav.reviews")} />
      </div>
    </div>
  );
}

function AdminHome() {
  const { t } = useTranslation();
  const { data: stats } = useAdminPlatformStats();

  const totalUsers = stats?.users.byRole.reduce((sum, r) => sum + r.count, 0) ?? 0;
  const openDisputes =
    stats?.disputes.byStatus
      .filter((d) => d.status !== "resolved")
      .reduce((sum, d) => sum + d.count, 0) ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<UsersIcon />} label={t("dashboard.stats.totalUsers")} value={totalUsers} />
        <StatCard
          icon={<CoinIcon />}
          label={t("dashboard.stats.completedGMV")}
          value={`${(stats?.orders.completedGMV ?? 0).toFixed(0)} ${t("common.egp")}`}
          tone="success"
        />
        <StatCard
          icon={<AlertIcon />}
          label={t("dashboard.stats.openDisputes")}
          value={openDisputes}
          tone={openDisputes > 0 ? "danger" : "neutral"}
        />
        <StatCard
          icon={<StarIcon />}
          label={t("dashboard.stats.avgRating")}
          value={(stats?.reviews.average ?? 0).toFixed(1)}
          tone="warning"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLink to="/admin/verification-queue" label={t("nav.verificationQueue")} />
        <QuickLink to="/admin/products-queue" label={t("nav.moderationQueue")} />
        <QuickLink to="/admin/disputes-queue" label={t("nav.disputesQueue")} />
        <QuickLink to="/admin/withdrawals" label={t("nav.withdrawals")} />
        <QuickLink to="/admin/users" label={t("nav.users")} />
        <QuickLink to="/admin/catalog" label={t("admin.catalog.title")} />
        <QuickLink to="/admin/stats" label={t("nav.stats")} />
        <QuickLink to="/admin/settings" label={t("nav.settings")} />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { data: me, isLoading } = useMe();
  const { data: trust } = useMyTrustBadge();
  const activeRole = useActiveRoleStore((s) => s.activeRole);

  if (isLoading || !me) {
    return <p className="text-neutral-500">{t("common.loading")}</p>;
  }

  const name = me.customerProfile
    ? `${me.customerProfile.firstName} ${me.customerProfile.lastName}`
    : (me.sellerProfile?.fullName ?? me.merchantProfile?.businessName ?? me.email);

  const role = activeRole ?? me.roles[0];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">
              {t("dashboard.welcome", { name })}
            </h1>
            <p className="mt-1 text-sm text-neutral-600">{me.email}</p>
          </div>
          {trust && (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <span className="h-6 w-6">
                <StarIcon />
              </span>
            </span>
          )}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-neutral-500">{t("dashboard.yourRoles")}</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {me.roles.map((r) => (
                <span
                  key={r}
                  className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700"
                >
                  {t(`roles.${r}`)}
                </span>
              ))}
            </dd>
          </div>
          {trust && (
            <div>
              <dt className="font-medium text-neutral-500">{t("dashboard.trustLevel")}</dt>
              <dd className="mt-1">
                <Badge tone={TRUST_TONE[trust.level]}>{t(`trustLevel.${trust.level}`)}</Badge>
              </dd>
            </div>
          )}
        </dl>
      </Card>

      {role === "customer" && <CustomerHome />}
      {role === "seller" && <SellerHome />}
      {role === "merchant" && <MerchantHome />}
      {role === "admin" && <AdminHome />}
    </div>
  );
}

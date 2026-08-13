import { useTranslation } from "react-i18next";
import { useAdminPlatformStats } from "@/features/admin/hooks";
import { Card } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-900">{value}</p>
    </Card>
  );
}

function BreakdownCard({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number }[];
}) {
  return (
    <Card>
      <h2 className="text-sm font-semibold text-neutral-700">{title}</h2>
      <dl className="mt-2 flex flex-col gap-1">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-sm">
            <dt className="text-neutral-600">{item.label}</dt>
            <dd className="font-medium text-neutral-900">{item.count}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function AdminStatsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useAdminPlatformStats();

  if (isLoading || !data) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">{t("admin.stats.title")}</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label={t("admin.stats.completedGMV")}
          value={`${data.orders.completedGMV.toFixed(2)} ${t("common.egp")}`}
        />
        <StatCard
          label={t("admin.stats.platformBalances")}
          value={`${data.wallet.platformBalances.available.toFixed(2)} ${t("common.egp")}`}
        />
        <StatCard
          label={t("admin.stats.pendingWithdrawals")}
          value={data.wallet.pendingWithdrawals.count}
        />
        <StatCard label={t("admin.stats.averageRating")} value={data.reviews.average.toFixed(1)} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BreakdownCard
          title={t("admin.stats.usersByRole")}
          items={data.users.byRole.map((r) => ({ label: t(`roles.${r.role}`), count: r.count }))}
        />
        <BreakdownCard
          title={t("admin.stats.usersByStatus")}
          items={data.users.byStatus.map((s) => ({
            label: t(`accountStatus.${s.status}`),
            count: s.count,
          }))}
        />
        <BreakdownCard
          title={t("admin.stats.ordersByStage")}
          items={data.orders.byStage.map((o) => ({
            label: t(`orderStage.${o.stage}`),
            count: o.count,
          }))}
        />
        <BreakdownCard
          title={t("admin.stats.disputesByStatus")}
          items={data.disputes.byStatus.map((d) => ({
            label: t(`disputeStatus.${d.status}`),
            count: d.count,
          }))}
        />
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-neutral-700">
          {t("admin.stats.disputeIntegrity")}
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          {t("admin.stats.counterfeitConfirmed")}: {data.disputes.counterfeitConfirmedCount}
        </p>
        <p className="text-sm text-neutral-600">
          {t("admin.stats.falseDisputes")}: {data.disputes.falseDisputeCount}
        </p>
      </Card>
    </div>
  );
}

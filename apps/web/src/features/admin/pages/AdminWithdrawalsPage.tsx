import { useTranslation } from "react-i18next";
import { useAdminWithdrawals, useProcessWithdrawal } from "@/features/admin/hooks";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorAlert } from "@/components/ui/Alert";

export function AdminWithdrawalsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useAdminWithdrawals();
  const process = useProcessWithdrawal();

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">{t("admin.withdrawals.title")}</h1>
      <ErrorAlert error={process.error} />

      {data && data.length === 0 && <EmptyState title={t("admin.withdrawals.empty")} />}

      <div className="flex flex-col gap-3">
        {data?.map((w) => (
          <Card key={w.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-neutral-900">
                {Number(w.amount).toFixed(2)} {t("common.egp")}
              </p>
              <p className="text-xs text-neutral-500">
                {t("admin.withdrawals.userId", { id: w.walletId })}
              </p>
              <p className="text-xs text-neutral-400">{new Date(w.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <Button
                fullWidth={false}
                loading={process.isPending}
                onClick={() => process.mutate({ id: w.id, approve: true })}
              >
                {t("admin.withdrawals.approve")}
              </Button>
              <Button
                variant="secondary"
                fullWidth={false}
                loading={process.isPending}
                onClick={() => process.mutate({ id: w.id, approve: false })}
              >
                {t("admin.withdrawals.reject")}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

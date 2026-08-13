import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMyDisputes } from "@/features/disputes/hooks";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

const STATUS_TONE = {
  open: "warning",
  seller_responded: "brand",
  resolved: "success",
} as const;

export function DisputesListPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useMyDisputes();

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">{t("disputes.list.title")}</h1>

      {data && data.length === 0 && (
        <EmptyState title={t("disputes.list.empty")} hint={t("disputes.list.emptyHint")} />
      )}

      <div className="flex flex-col gap-3">
        {data?.map((dispute) => (
          <Link key={dispute.id} to={`/disputes/${dispute.id}`}>
            <Card className="flex items-center justify-between p-4 transition-shadow hover:shadow-md">
              <div>
                <p className="font-medium text-neutral-900">
                  {t(`disputeReason.${dispute.reason}`)}
                </p>
                <p className="text-sm text-neutral-500">
                  {new Date(dispute.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Badge tone={STATUS_TONE[dispute.status]}>
                {t(`disputeStatus.${dispute.status}`)}
              </Badge>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

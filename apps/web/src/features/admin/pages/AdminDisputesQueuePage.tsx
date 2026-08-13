import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAdminDisputesQueue, useAdminDisputesAwaitingReview } from "@/features/admin/hooks";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Dispute } from "@/features/disputes/types";

function DisputeRow({ dispute }: { dispute: Dispute }) {
  const { t } = useTranslation();
  return (
    <Link to={`/admin/disputes/${dispute.id}`}>
      <Card className="flex items-center justify-between p-4 transition-shadow hover:shadow-md">
        <div>
          <p className="font-medium text-neutral-900">{t(`disputeReason.${dispute.reason}`)}</p>
          <p className="text-sm text-neutral-500">
            {new Date(dispute.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Badge tone={dispute.status === "seller_responded" ? "brand" : "warning"}>
          {t(`disputeStatus.${dispute.status}`)}
        </Badge>
      </Card>
    </Link>
  );
}

export function AdminDisputesQueuePage() {
  const { t } = useTranslation();
  const { data: waitingOnFulfiller, isLoading: loading1 } = useAdminDisputesQueue();
  const { data: readyForReview, isLoading: loading2 } = useAdminDisputesAwaitingReview();

  if (loading1 || loading2) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          {t("admin.disputes.awaitingReview")}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{t("admin.disputes.awaitingReviewHint")}</p>
        {readyForReview && readyForReview.length === 0 && (
          <EmptyState title={t("admin.disputes.emptyReview")} />
        )}
        <div className="mt-3 flex flex-col gap-3">
          {readyForReview?.map((d) => (
            <DisputeRow key={d.id} dispute={d} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-neutral-900">
          {t("admin.disputes.waitingOnFulfiller")}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          {t("admin.disputes.waitingOnFulfillerHint")}
        </p>
        {waitingOnFulfiller && waitingOnFulfiller.length === 0 && (
          <EmptyState title={t("admin.disputes.emptyQueue")} />
        )}
        <div className="mt-3 flex flex-col gap-3">
          {waitingOnFulfiller?.map((d) => (
            <DisputeRow key={d.id} dispute={d} />
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFulfillerDispute, useRespondToDispute } from "@/features/disputes/hooks";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { ErrorAlert } from "@/components/ui/Alert";
import { InfoAlert } from "@/components/ui/Alert";
import { PageSpinner } from "@/components/ui/Spinner";

const STATUS_TONE = { open: "warning", seller_responded: "brand", resolved: "success" } as const;

export function FulfillerDisputeDetailPage({
  basePath,
}: {
  basePath: "/sellers/me/disputes" | "/merchants/me/disputes";
}) {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: dispute, isLoading } = useFulfillerDispute(basePath, id);
  const respond = useRespondToDispute(basePath);
  const [response, setResponse] = useState("");

  if (isLoading || !dispute) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">
          {t(`disputeReason.${dispute.reason}`)}
        </h1>
        <Badge tone={STATUS_TONE[dispute.status]}>{t(`disputeStatus.${dispute.status}`)}</Badge>
      </div>

      <Card className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-neutral-700">
          {t("disputes.detail.description")}
        </h2>
        <p className="text-sm text-neutral-600">{dispute.description}</p>
        <p className="text-xs text-neutral-500">
          {t("disputes.detail.opened", { date: new Date(dispute.createdAt).toLocaleString() })}
        </p>
      </Card>

      {dispute.status === "open" && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-neutral-700">
            {t("fulfillerDisputes.respond")}
          </h2>
          <ErrorAlert error={respond.error} />
          <TextArea
            label={t("fulfillerDisputes.responseLabel")}
            rows={3}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
          />
          <Button
            fullWidth={false}
            loading={respond.isPending}
            disabled={!response}
            onClick={() => dispute && respond.mutate({ disputeId: dispute.id, response })}
          >
            {t("common.submit")}
          </Button>
        </Card>
      )}

      {dispute.sellerResponse && (
        <Card>
          <h2 className="text-sm font-semibold text-neutral-700">
            {t("disputes.detail.sellerResponse")}
          </h2>
          <p className="mt-1 text-sm text-neutral-600">{dispute.sellerResponse}</p>
        </Card>
      )}

      {dispute.status === "resolved" && dispute.resolution && (
        <Card className="border-brand-200 bg-brand-50">
          <h2 className="text-sm font-semibold text-brand-900">
            {t("disputes.detail.resolution")}
          </h2>
          <p className="mt-1 text-sm font-medium text-brand-800">
            {t(`disputeResolution.${dispute.resolution}`)}
          </p>
          {dispute.resolutionNote && (
            <p className="mt-1 text-sm text-brand-700">{dispute.resolutionNote}</p>
          )}
        </Card>
      )}

      {dispute.status === "seller_responded" && (
        <InfoAlert>{t("disputes.detail.awaitingAdmin")}</InfoAlert>
      )}
    </div>
  );
}

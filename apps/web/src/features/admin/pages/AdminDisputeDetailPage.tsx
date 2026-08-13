import { useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { DISPUTE_RESOLUTIONS, type DisputeResolution } from "@foryou/shared";
import { useAdminDispute, useResolveDispute } from "@/features/admin/hooks";
import { mediaApi } from "@/features/media/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextArea } from "@/components/ui/TextArea";
import { TextField } from "@/components/ui/TextField";
import { ErrorAlert } from "@/components/ui/Alert";
import { PageSpinner } from "@/components/ui/Spinner";

function EvidenceThumbnail({ mediaAssetId }: { mediaAssetId: string }) {
  const { data } = useQuery({
    queryKey: ["media", mediaAssetId],
    queryFn: () => mediaApi.get(mediaAssetId),
  });
  if (!data?.url) return null;
  return (
    <a href={data.url} target="_blank" rel="noreferrer">
      <img src={data.url} alt="" className="h-24 w-24 rounded object-cover" />
    </a>
  );
}

const STATUS_TONE = { open: "warning", seller_responded: "brand", resolved: "success" } as const;

export function AdminDisputeDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: dispute, isLoading } = useAdminDispute(id);
  const resolve = useResolveDispute();

  const [resolution, setResolution] = useState<DisputeResolution>("full_refund");
  const [resolutionNote, setResolutionNote] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [counterfeitConfirmed, setCounterfeitConfirmed] = useState(false);
  const [falseDispute, setFalseDispute] = useState(false);

  if (isLoading || !dispute) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">
          {t(`disputeReason.${dispute.reason}`)}
        </h1>
        <Badge tone={STATUS_TONE[dispute.status]}>{t(`disputeStatus.${dispute.status}`)}</Badge>
      </div>

      <Card className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-700">
            {t("disputes.detail.description")}
          </h2>
          <p className="text-sm text-neutral-600">{dispute.description}</p>
        </div>
        {dispute.evidence.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-neutral-700">
              {t("admin.disputes.evidence")}
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {dispute.evidence.map((e) => (
                <EvidenceThumbnail key={e.id} mediaAssetId={e.mediaAssetId} />
              ))}
            </div>
          </div>
        )}
        {dispute.sellerResponse && (
          <div>
            <h2 className="text-sm font-semibold text-neutral-700">
              {t("disputes.detail.sellerResponse")}
            </h2>
            <p className="text-sm text-neutral-600">{dispute.sellerResponse}</p>
          </div>
        )}
      </Card>

      {dispute.status !== "resolved" ? (
        <Card className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-neutral-700">
            {t("admin.disputes.resolveTitle")}
          </h2>
          <ErrorAlert error={resolve.error} />

          <Select
            label={t("admin.disputes.resolution")}
            value={resolution}
            onChange={(e) => setResolution(e.target.value as DisputeResolution)}
          >
            {DISPUTE_RESOLUTIONS.map((r) => (
              <option key={r} value={r}>
                {t(`disputeResolution.${r}`)}
              </option>
            ))}
          </Select>

          <TextArea
            label={t("admin.disputes.resolutionNote")}
            rows={3}
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
          />

          {resolution === "partial_refund" && (
            <TextField
              label={t("admin.disputes.refundAmount")}
              type="number"
              min={0.01}
              step="0.01"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
            />
          )}

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={counterfeitConfirmed}
                onChange={(e) => setCounterfeitConfirmed(e.target.checked)}
              />
              {t("admin.disputes.counterfeitConfirmed")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={falseDispute}
                onChange={(e) => setFalseDispute(e.target.checked)}
              />
              {t("admin.disputes.falseDispute")}
            </label>
          </div>

          <Button
            fullWidth={false}
            loading={resolve.isPending}
            disabled={!resolutionNote || (resolution === "partial_refund" && !refundAmount)}
            onClick={() =>
              resolve.mutate({
                id: dispute.id,
                resolution,
                resolutionNote,
                refundAmount: resolution === "partial_refund" ? Number(refundAmount) : undefined,
                counterfeitConfirmed,
                falseDispute,
              })
            }
          >
            {t("admin.disputes.resolveSubmit")}
          </Button>
        </Card>
      ) : (
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
    </div>
  );
}

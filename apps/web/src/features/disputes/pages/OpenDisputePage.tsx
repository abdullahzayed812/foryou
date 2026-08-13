import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DISPUTE_REASONS, type DisputeReason } from "@foryou/shared";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/Alert";
import { useOpenDispute } from "@/features/disputes/hooks";
import { uploadMediaAsset } from "@/features/media/api";

export function OpenDisputePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const openDispute = useOpenDispute();

  const [reason, setReason] = useState<DisputeReason>("wrong_product");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId || photos.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      const photoMediaAssetIds = await Promise.all(
        photos.map((f) => uploadMediaAsset(f, "dispute_evidence")),
      );
      openDispute.mutate(
        { orderId, reason, description, photoMediaAssetIds },
        { onSuccess: () => void navigate(`/orders/${orderId}`) },
      );
    } catch {
      setUploadError(t("disputes.open.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="mx-auto max-w-xl">
      <h1 className="text-xl font-bold text-neutral-900">{t("disputes.open.title")}</h1>
      <p className="mt-1 text-sm text-neutral-600">{t("disputes.open.subtitle")}</p>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <ErrorAlert error={openDispute.error} />
        {uploadError && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {uploadError}
          </div>
        )}

        <Select
          label={t("disputes.open.reason")}
          value={reason}
          onChange={(e) => setReason(e.target.value as DisputeReason)}
        >
          {DISPUTE_REASONS.map((r) => (
            <option key={r} value={r}>
              {t(`disputeReason.${r}`)}
            </option>
          ))}
        </Select>

        <TextArea
          label={t("disputes.open.description")}
          hint={t("disputes.open.descriptionHint")}
          rows={4}
          minLength={10}
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-800">
            {t("disputes.open.photos")}
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
            className="text-sm"
          />
          <p className="text-xs text-neutral-500">{t("disputes.open.photosHint")}</p>
        </div>

        <Button
          type="submit"
          loading={uploading || openDispute.isPending}
          disabled={photos.length === 0 || description.length < 10}
        >
          {t("disputes.open.submit")}
        </Button>
      </form>
    </Card>
  );
}

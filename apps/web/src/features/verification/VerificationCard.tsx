import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/Alert";
import { uploadMediaAsset } from "@/features/media/api";
import {
  useMyVerification,
  useSubmitIdentityVerification,
  useSubmitBusinessVerification,
} from "./hooks";
import type { VerificationStatus } from "./types";

const STATUS_TONE: Record<VerificationStatus, "success" | "warning" | "danger" | "neutral"> = {
  approved: "success",
  pending: "warning",
  more_docs_needed: "warning",
  rejected: "danger",
  revoked: "danger",
};

function useLatest(type: "identity" | "business") {
  const { data } = useMyVerification();
  return data?.find((r) => r.type === type);
}

export function IdentityVerificationCard() {
  const { t } = useTranslation();
  const latest = useLatest("identity");
  const submit = useSubmitIdentityVerification();
  const [nationalId, setNationalId] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const canSubmit = !latest || latest.status === "rejected" || latest.status === "more_docs_needed";

  async function onSubmit() {
    if (!nationalId || !selfie) return;
    setUploadError(null);
    setUploading(true);
    try {
      const [nationalIdMediaAssetId, selfieMediaAssetId] = await Promise.all([
        uploadMediaAsset(nationalId, "verification_document"),
        uploadMediaAsset(selfie, "verification_document"),
      ]);
      submit.mutate({ nationalIdMediaAssetId, selfieMediaAssetId });
    } catch {
      setUploadError(t("verification.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-700">
          {t("verification.identity.title")}
        </h2>
        {latest && (
          <Badge tone={STATUS_TONE[latest.status]}>
            {t(`verificationStatus.${latest.status}`)}
          </Badge>
        )}
      </div>

      {latest?.status === "rejected" && latest.rejectionReason && (
        <p className="text-sm text-red-600">{latest.rejectionReason}</p>
      )}

      {canSubmit && (
        <div className="flex flex-col gap-3">
          <ErrorAlert error={submit.error} />
          {uploadError && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {uploadError}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-800">
              {t("verification.identity.nationalId")}
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setNationalId(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-800">
              {t("verification.identity.selfie")}
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setSelfie(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </div>
          <Button
            fullWidth={false}
            loading={uploading || submit.isPending}
            disabled={!nationalId || !selfie}
            onClick={onSubmit}
          >
            {t("verification.submit")}
          </Button>
        </div>
      )}
    </Card>
  );
}

export function BusinessVerificationCard() {
  const { t } = useTranslation();
  const latest = useLatest("business");
  const submit = useSubmitBusinessVerification();
  const [doc, setDoc] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const canSubmit = !latest || latest.status === "rejected" || latest.status === "more_docs_needed";

  async function onSubmit() {
    if (!doc) return;
    setUploadError(null);
    setUploading(true);
    try {
      const commercialRegistrationMediaAssetId = await uploadMediaAsset(
        doc,
        "verification_document",
      );
      submit.mutate({ commercialRegistrationMediaAssetId });
    } catch {
      setUploadError(t("verification.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-700">
          {t("verification.business.title")}
        </h2>
        {latest && (
          <Badge tone={STATUS_TONE[latest.status]}>
            {t(`verificationStatus.${latest.status}`)}
          </Badge>
        )}
      </div>

      {latest?.status === "rejected" && latest.rejectionReason && (
        <p className="text-sm text-red-600">{latest.rejectionReason}</p>
      )}

      {canSubmit && (
        <div className="flex flex-col gap-3">
          <ErrorAlert error={submit.error} />
          {uploadError && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {uploadError}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-800">
              {t("verification.business.commercialRegistration")}
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setDoc(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </div>
          <Button
            fullWidth={false}
            loading={uploading || submit.isPending}
            disabled={!doc}
            onClick={onSubmit}
          >
            {t("verification.submit")}
          </Button>
        </div>
      )}
    </Card>
  );
}

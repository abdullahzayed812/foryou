import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useAdminVerificationQueue,
  useApproveVerification,
  useRejectVerification,
  useRequestMoreDocs,
} from "@/features/admin/hooks";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorAlert } from "@/components/ui/Alert";
import type { AdminVerificationRequest } from "@/features/admin/types";

function QueueRow({ request }: { request: AdminVerificationRequest }) {
  const { t } = useTranslation();
  const approve = useApproveVerification();
  const reject = useRejectVerification();
  const requestMoreDocs = useRequestMoreDocs();
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [showMoreDocs, setShowMoreDocs] = useState(false);

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-neutral-900">
            {t(`verificationRequestType.${request.type}`)}
          </p>
          <p className="text-xs text-neutral-500">
            {t("admin.verification.userId", { id: request.userId })}
          </p>
        </div>
        <Badge>{t(`verificationStatus.${request.status}`)}</Badge>
      </div>

      <div className="flex flex-wrap gap-3">
        {request.documents.map((doc) =>
          doc.url ? (
            <a
              key={doc.id}
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1"
            >
              <img
                src={doc.url}
                alt={t(`documentType.${doc.documentType}`)}
                className="h-24 w-24 rounded-md border border-neutral-200 object-cover"
              />
              <span className="text-xs text-neutral-600">
                {t(`documentType.${doc.documentType}`)}
              </span>
            </a>
          ) : (
            <Badge key={doc.id}>{t(`documentType.${doc.documentType}`)}</Badge>
          ),
        )}
      </div>

      <ErrorAlert error={approve.error ?? reject.error ?? requestMoreDocs.error} />

      <div className="flex flex-wrap gap-2">
        <Button
          fullWidth={false}
          loading={approve.isPending}
          onClick={() => approve.mutate(request.id)}
        >
          {t("admin.verification.approve")}
        </Button>
        <Button variant="secondary" fullWidth={false} onClick={() => setShowReject((s) => !s)}>
          {t("admin.verification.reject")}
        </Button>
        <Button variant="secondary" fullWidth={false} onClick={() => setShowMoreDocs((s) => !s)}>
          {t("admin.verification.requestMoreDocs")}
        </Button>
      </div>

      {showReject && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <TextField
              label={t("admin.verification.reasonLabel")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            fullWidth={false}
            loading={reject.isPending}
            disabled={!reason}
            onClick={() =>
              reject.mutate({ id: request.id, reason }, { onSuccess: () => setShowReject(false) })
            }
          >
            {t("common.submit")}
          </Button>
        </div>
      )}

      {showMoreDocs && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <TextField
              label={t("admin.verification.messageLabel")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            fullWidth={false}
            loading={requestMoreDocs.isPending}
            disabled={!reason}
            onClick={() =>
              requestMoreDocs.mutate(
                { id: request.id, message: reason },
                { onSuccess: () => setShowMoreDocs(false) },
              )
            }
          >
            {t("common.submit")}
          </Button>
        </div>
      )}
    </Card>
  );
}

export function AdminVerificationQueuePage() {
  const { t } = useTranslation();
  const { data, isLoading } = useAdminVerificationQueue();

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">{t("admin.verification.title")}</h1>
      {data && data.length === 0 && <EmptyState title={t("admin.verification.empty")} />}
      <div className="flex flex-col gap-3">
        {data?.map((request) => (
          <QueueRow key={request.id} request={request} />
        ))}
      </div>
    </div>
  );
}

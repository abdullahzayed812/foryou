import { useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAdminUser, useSuspendUser, useReactivateUser } from "@/features/admin/hooks";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { PageSpinner } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/Alert";

const STATUS_TONE = { active: "success", suspended: "warning", banned: "danger" } as const;

export function AdminUserDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: user, isLoading } = useAdminUser(id);
  const suspend = useSuspendUser();
  const reactivate = useReactivateUser();
  const [reason, setReason] = useState("");

  if (isLoading || !user) return <PageSpinner />;

  const name = user.customerProfile
    ? `${user.customerProfile.firstName} ${user.customerProfile.lastName}`
    : (user.sellerProfile?.fullName ?? user.merchantProfile?.businessName ?? user.email);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">{name}</h1>
        <Badge tone={STATUS_TONE[user.status]}>{t(`accountStatus.${user.status}`)}</Badge>
      </div>

      <Card className="flex flex-col gap-2">
        <p className="text-sm text-neutral-600">{user.email}</p>
        <p className="text-xs text-neutral-500">
          {t("admin.users.registered", { date: new Date(user.createdAt).toLocaleDateString() })}
        </p>
        <div className="flex flex-wrap gap-1">
          {user.roles.map((r) => (
            <Badge key={r}>{t(`roles.${r}`)}</Badge>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <ErrorAlert error={suspend.error ?? reactivate.error} />
        {user.status === "active" ? (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <TextField
                label={t("admin.users.suspendReason")}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              fullWidth={false}
              loading={suspend.isPending}
              onClick={() => suspend.mutate({ id: user.id, reason: reason || undefined })}
            >
              {t("admin.users.suspend")}
            </Button>
          </div>
        ) : (
          <Button
            fullWidth={false}
            loading={reactivate.isPending}
            onClick={() => reactivate.mutate(user.id)}
          >
            {t("admin.users.reactivate")}
          </Button>
        )}
      </Card>
    </div>
  );
}

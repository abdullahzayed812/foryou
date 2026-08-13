import { useTranslation } from "react-i18next";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/features/notifications/hooks";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

export function NotificationsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">{t("notifications.page.title")}</h1>
        {data && data.some((n) => !n.readAt) && (
          <Button
            variant="secondary"
            fullWidth={false}
            loading={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            {t("notifications.page.markAllRead")}
          </Button>
        )}
      </div>

      {data && data.length === 0 && <EmptyState title={t("notifications.page.empty")} />}

      <div className="flex flex-col gap-2">
        {data?.map((n) => (
          <Card
            key={n.id}
            className={`flex items-start justify-between gap-4 p-4 ${n.readAt ? "" : "border-brand-200 bg-brand-50/40"}`}
          >
            <div>
              <p className="font-medium text-neutral-900">{n.title}</p>
              <p className="mt-0.5 text-sm text-neutral-600">{n.body}</p>
              <p className="mt-1 text-xs text-neutral-400">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
            {!n.readAt && (
              <Button
                variant="ghost"
                className="shrink-0"
                fullWidth={false}
                onClick={() => markRead.mutate(n.id)}
              >
                {t("notifications.page.markRead")}
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

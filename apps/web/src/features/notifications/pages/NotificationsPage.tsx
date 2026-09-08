import { useTranslation } from "react-i18next";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/features/notifications/hooks";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { BellIcon } from "@/components/ui/icons";

export function NotificationsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const hasUnread = data?.some((n) => !n.readAt) ?? false;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("notifications.page.title")}
        actions={
          hasUnread && (
            <Button
              variant="secondary"
              fullWidth={false}
              loading={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              {t("notifications.page.markAllRead")}
            </Button>
          )
        }
      />

      {isLoading && <ListSkeleton rows={5} />}

      {!isLoading && data && data.length === 0 && (
        <EmptyState icon={<BellIcon />} title={t("notifications.page.empty")} />
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="flex flex-col gap-2">
          {data.map((n) => (
            <Card
              key={n.id}
              className={`flex items-start justify-between gap-4 p-4 ${
                n.readAt ? "" : "border-brand-200 bg-brand-50/40"
              }`}
            >
              <div className="min-w-0">
                <p className="font-medium text-neutral-900">{n.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-neutral-600">{n.body}</p>
                <p className="mt-1.5 text-xs text-neutral-500">
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
      )}
    </div>
  );
}

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { NOTIFICATION_PREFERENCE_CATEGORIES } from "@foryou/shared";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert, InfoAlert } from "@/components/ui/Alert";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/features/notifications/hooks";

export function NotificationSettingsPage() {
  const { t } = useTranslation();
  const { data: prefs, isLoading, isError, error, refetch } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link to="/settings" className="text-sm font-medium text-brand-700 hover:underline">
          {t("settings.back")}
        </Link>
        <PageHeader
          title={t("settings.notifications.title")}
          subtitle={t("settings.notifications.subtitle")}
        />
      </div>

      <Card className="p-2 sm:p-4">
        {isLoading && (
          <div className="animate-pulse divide-y divide-neutral-100">
            {NOTIFICATION_PREFERENCE_CATEGORIES.map((c) => (
              <div key={c} className="flex items-center justify-between gap-4 py-4">
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 rounded bg-neutral-200" />
                  <div className="h-2.5 w-48 rounded bg-neutral-100" />
                </div>
                <div className="h-6 w-11 rounded-full bg-neutral-200" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="p-3">
            <ErrorAlert error={error} />
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 text-sm font-medium text-brand-700 hover:underline"
            >
              {t("common.retry")}
            </button>
          </div>
        )}

        {prefs && (
          <div className="divide-y divide-neutral-100 px-2">
            {NOTIFICATION_PREFERENCE_CATEGORIES.map((category) => (
              <Toggle
                key={category}
                checked={prefs[category]}
                disabled={update.isPending}
                onChange={(next) => update.mutate({ [category]: next })}
                label={t(`settings.notifications.categories.${category}.title`)}
                description={t(`settings.notifications.categories.${category}.desc`)}
              />
            ))}
          </div>
        )}
      </Card>

      {update.isError && <ErrorAlert error={update.error} />}

      <InfoAlert>{t("settings.notifications.alwaysOn")}</InfoAlert>
    </div>
  );
}

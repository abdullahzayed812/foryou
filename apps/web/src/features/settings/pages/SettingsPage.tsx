import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useLogout } from "@/features/auth/hooks";

const SECTIONS = [
  { to: "/profile", titleKey: "settings.sections.profile.title", descKey: "settings.sections.profile.desc" },
  {
    to: "/settings/notifications",
    titleKey: "settings.sections.notifications.title",
    descKey: "settings.sections.notifications.desc",
  },
] as const;

export function SettingsPage() {
  const { t } = useTranslation();
  const logout = useLogout();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <div className="flex flex-col gap-3">
        {SECTIONS.map((section) => (
          <Link key={section.to} to={section.to} className="group">
            <Card className="flex items-center justify-between gap-4 p-5 transition-shadow group-hover:shadow-lifted">
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold text-neutral-900">
                  {t(section.titleKey)}
                </p>
                <p className="mt-0.5 text-sm text-neutral-500">{t(section.descKey)}</p>
              </div>
              <span aria-hidden="true" className="text-neutral-400 rtl:rotate-180">
                →
              </span>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="font-display text-sm font-semibold text-neutral-900">
            {t("settings.language.title")}
          </p>
          <p className="mt-0.5 text-sm text-neutral-500">{t("settings.language.desc")}</p>
        </div>
        <LanguageSwitcher />
      </Card>

      <Button
        variant="secondary"
        fullWidth={false}
        loading={logout.isPending}
        onClick={() => logout.mutate()}
        className="self-start"
      >
        {t("settings.signOut")}
      </Button>
    </div>
  );
}

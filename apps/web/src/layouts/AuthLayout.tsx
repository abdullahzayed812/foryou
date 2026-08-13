import { Outlet, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

export function AuthLayout() {
  const { t } = useTranslation();
  return (
    <div className="relative flex min-h-full flex-col overflow-hidden bg-neutral-50">
      {/* Ambient brand/accent wash — static (no motion) behind the auth card, kept
          low-opacity so it reads as atmosphere, not decoration competing with the form. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(600px circle at 15% 10%, var(--color-brand-100), transparent 60%), radial-gradient(560px circle at 90% 30%, var(--color-accent-100), transparent 55%)",
        }}
      />
      <header className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="font-display text-gradient-brand text-lg font-extrabold tracking-tight">
          {t("common.appName")}
        </Link>
        <LanguageSwitcher />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

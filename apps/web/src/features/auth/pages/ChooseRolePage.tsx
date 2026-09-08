import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/Card";

const ROLES = [
  { role: "customer", to: "/register/customer" },
  { role: "seller", to: "/register/seller" },
  { role: "merchant", to: "/register/merchant" },
] as const;

export function ChooseRolePage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-neutral-900">
          {t("auth.chooseRole.title")}
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-neutral-600">
          {t("auth.chooseRole.subtitle")}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {ROLES.map(({ role, to }) => (
          <Link key={role} to={to} className="group">
            <Card className="flex items-center justify-between gap-4 transition-all group-hover:border-brand-300 group-hover:shadow-lifted">
              <div className="min-w-0">
                <p className="font-display font-semibold text-neutral-900">{t(`roles.${role}`)}</p>
                <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                  {t(`auth.chooseRole.${role}Desc`)}
                </p>
              </div>
              <span aria-hidden="true" className="text-brand-400 rtl:rotate-180">→</span>
            </Card>
          </Link>
        ))}
      </div>

      <p className="text-center text-sm text-neutral-600">
        {t("auth.chooseRole.haveAccount")}{" "}
        <Link to="/login" className="font-semibold text-brand-700 hover:underline">
          {t("auth.chooseRole.signIn")}
        </Link>
      </p>
    </div>
  );
}

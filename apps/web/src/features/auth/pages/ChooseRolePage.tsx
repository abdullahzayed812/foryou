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
        <h1 className="text-2xl font-bold text-neutral-900">{t("auth.chooseRole.title")}</h1>
        <p className="mt-1 text-sm text-neutral-600">{t("auth.chooseRole.subtitle")}</p>
      </div>

      <div className="flex flex-col gap-3">
        {ROLES.map(({ role, to }) => (
          <Link key={role} to={to}>
            <Card className="transition-shadow hover:shadow-md">
              <p className="font-semibold text-neutral-900">{t(`roles.${role}`)}</p>
              <p className="mt-1 text-sm text-neutral-600">{t(`auth.chooseRole.${role}Desc`)}</p>
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

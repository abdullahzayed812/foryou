import { useTranslation } from "react-i18next";
import {
  IdentityVerificationCard,
  BusinessVerificationCard,
} from "@/features/verification/VerificationCard";

export function MerchantVerificationPage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">{t("verification.title")}</h1>
      <p className="text-sm text-neutral-600">{t("verification.merchantHint")}</p>
      <BusinessVerificationCard />
      <IdentityVerificationCard />
    </div>
  );
}

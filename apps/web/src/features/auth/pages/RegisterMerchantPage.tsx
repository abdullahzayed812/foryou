import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { registerMerchantSchema, COUNTRIES, type RegisterMerchantInput } from "@foryou/shared";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useRegisterMerchant } from "@/features/auth/hooks";

export function RegisterMerchantPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const registerMerchant = useRegisterMerchant();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterMerchantInput>({ resolver: zodResolver(registerMerchantSchema) });

  const onSubmit = handleSubmit((data) => {
    registerMerchant.mutate(data, {
      onSuccess: (res) => void navigate(`/verify-otp?email=${encodeURIComponent(res.email)}`),
    });
  });

  return (
    <Card>
      <h1 className="text-xl font-bold text-neutral-900">
        {t("auth.register.title", { role: t("roles.merchant") })}
      </h1>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <ErrorBanner error={registerMerchant.error} />

        <TextField
          label={t("auth.register.businessName")}
          error={errors.businessName?.message}
          {...register("businessName")}
        />
        <TextField
          label={t("auth.register.ownerName")}
          error={errors.ownerName?.message}
          {...register("ownerName")}
        />

        <TextField
          label={t("auth.register.email")}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label={t("auth.register.password")}
          type="password"
          autoComplete="new-password"
          hint={t("auth.register.passwordHint")}
          error={errors.password?.message}
          {...register("password")}
        />

        <TextField
          label={t("auth.register.phoneNumber")}
          type="tel"
          error={errors.phoneNumber?.message}
          {...register("phoneNumber")}
        />

        <div className="grid grid-cols-2 gap-4">
          <TextField
            label={t("auth.register.governorate")}
            error={errors.governorate?.message}
            {...register("governorate")}
          />
          <TextField
            label={t("auth.register.city")}
            error={errors.city?.message}
            {...register("city")}
          />
        </div>

        <TextField
          label={t("auth.register.businessCategory")}
          error={errors.businessCategory?.message}
          {...register("businessCategory")}
        />
        <Select
          label={t("auth.register.importCountry")}
          error={errors.importCountry?.message}
          {...register("importCountry")}
        >
          <option value="">{t("common.selectOne")}</option>
          {COUNTRIES.map((code) => (
            <option key={code} value={code}>
              {t(`countries.${code}`)}
            </option>
          ))}
        </Select>

        <Button type="submit" loading={registerMerchant.isPending}>
          {t("auth.register.submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-600">
        {t("auth.register.haveAccount")}{" "}
        <Link to="/login" className="font-semibold text-brand-700 hover:underline">
          {t("auth.register.signIn")}
        </Link>
      </p>
    </Card>
  );
}

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { registerCustomerSchema, type RegisterCustomerInput } from "@foryou/shared";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useRegisterCustomer } from "@/features/auth/hooks";

export function RegisterCustomerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const registerCustomer = useRegisterCustomer();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterCustomerInput>({ resolver: zodResolver(registerCustomerSchema) });

  const onSubmit = handleSubmit((data) => {
    registerCustomer.mutate(data, {
      onSuccess: (res) => void navigate(`/verify-otp?email=${encodeURIComponent(res.email)}`),
    });
  });

  return (
    <Card>
      <h1 className="text-xl font-bold text-neutral-900">
        {t("auth.register.title", { role: t("roles.customer") })}
      </h1>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <ErrorBanner error={registerCustomer.error} />

        <div className="grid grid-cols-2 gap-4">
          <TextField
            label={t("auth.register.firstName")}
            error={errors.firstName?.message}
            {...register("firstName")}
          />
          <TextField
            label={t("auth.register.lastName")}
            error={errors.lastName?.message}
            {...register("lastName")}
          />
        </div>

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
          label={t("auth.register.mobileNumber")}
          type="tel"
          error={errors.mobileNumber?.message}
          {...register("mobileNumber", { setValueAs: (v: string) => (v === "" ? undefined : v) })}
        />

        <Button type="submit" loading={registerCustomer.isPending}>
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

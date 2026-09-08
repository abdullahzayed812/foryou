import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@foryou/shared";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SuccessPanel } from "@/components/ui/SuccessPanel";
import { useForgotPassword } from "@/features/auth/hooks";

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const forgot = useForgotPassword();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit((data) => forgot.mutate(data));

  // The API answers 202 whether or not the address has an account, so a
  // success here only means "the request was accepted" — never that the
  // email exists.
  if (forgot.isSuccess) {
    return (
      <Card>
        <SuccessPanel
          title={t("auth.forgotPassword.sentTitle")}
          body={t("auth.forgotPassword.sentBody", { email: getValues("email") })}
          action={
            <Link to="/login">
              <Button variant="secondary">{t("auth.forgotPassword.backToLogin")}</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="font-display text-xl font-bold text-neutral-900">
        {t("auth.forgotPassword.title")}
      </h1>
      <p className="mt-1 text-sm leading-relaxed text-neutral-600">
        {t("auth.forgotPassword.subtitle")}
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <ErrorBanner error={forgot.error} />

        <TextField
          label={t("auth.forgotPassword.email")}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />

        <Button type="submit" loading={forgot.isPending}>
          {t("auth.forgotPassword.submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-600">
        <Link to="/login" className="font-semibold text-brand-700 hover:underline">
          {t("auth.forgotPassword.backToLogin")}
        </Link>
      </p>
    </Card>
  );
}

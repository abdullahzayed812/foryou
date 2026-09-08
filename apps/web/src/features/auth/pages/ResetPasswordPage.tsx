import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { resetPasswordSchema } from "@foryou/shared";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SuccessPanel } from "@/components/ui/SuccessPanel";
import { useResetPassword } from "@/features/auth/hooks";

// The shared schema covers `token` + `newPassword`; the confirm field is a
// client-only guard, so it's added here rather than in @foryou/shared.
const formSchema = resetPasswordSchema
  .extend({ confirmPassword: z.string().min(1) })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "PASSWORDS_DO_NOT_MATCH",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const reset = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { token, newPassword: "", confirmPassword: "" },
  });

  if (!token) return <Navigate to="/forgot-password" replace />;

  const onSubmit = handleSubmit(({ confirmPassword: _confirm, ...data }) => reset.mutate(data));

  if (reset.isSuccess) {
    return (
      <Card>
        <SuccessPanel
          title={t("auth.resetPassword.doneTitle")}
          body={t("auth.resetPassword.doneBody")}
          action={
            <Link to="/login">
              <Button>{t("auth.resetPassword.goToLogin")}</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="font-display text-xl font-bold text-neutral-900">
        {t("auth.resetPassword.title")}
      </h1>
      <p className="mt-1 text-sm leading-relaxed text-neutral-600">
        {t("auth.resetPassword.subtitle")}
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <ErrorBanner error={reset.error} />
        <input type="hidden" {...register("token")} />

        <TextField
          label={t("auth.resetPassword.newPassword")}
          type="password"
          autoComplete="new-password"
          hint={t("auth.register.passwordHint")}
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <TextField
          label={t("auth.resetPassword.confirmPassword")}
          type="password"
          autoComplete="new-password"
          error={
            errors.confirmPassword?.message === "PASSWORDS_DO_NOT_MATCH"
              ? t("auth.resetPassword.mismatch")
              : errors.confirmPassword?.message
          }
          {...register("confirmPassword")}
        />

        <Button type="submit" loading={reset.isPending}>
          {t("auth.resetPassword.submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-600">
        <Link to="/forgot-password" className="font-semibold text-brand-700 hover:underline">
          {t("auth.resetPassword.requestNew")}
        </Link>
      </p>
    </Card>
  );
}

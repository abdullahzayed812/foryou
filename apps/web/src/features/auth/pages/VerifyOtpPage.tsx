import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { verifyOtpSchema, type VerifyOtpInput } from "@foryou/shared";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useVerifyOtp, useResendOtp } from "@/features/auth/hooks";

export function VerifyOtpPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const verifyOtp = useVerifyOtp();
  const resendOtp = useResendOtp();
  const [resent, setResent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyOtpInput>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { email, code: "" },
  });

  if (!email) return <Navigate to="/register" replace />;

  const onSubmit = handleSubmit((data) => {
    verifyOtp.mutate(data, { onSuccess: () => void navigate("/dashboard", { replace: true }) });
  });

  return (
    <Card>
      <h1 className="text-xl font-bold text-neutral-900">{t("auth.otp.title")}</h1>
      <p className="mt-1 text-sm text-neutral-600">{t("auth.otp.subtitle", { email })}</p>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <ErrorBanner error={verifyOtp.error} />
        <input type="hidden" {...register("email")} />

        <TextField
          label={t("auth.otp.code")}
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          error={errors.code?.message}
          {...register("code")}
        />

        <Button type="submit" loading={verifyOtp.isPending}>
          {t("auth.otp.submit")}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm">
        <button
          type="button"
          onClick={() => {
            resendOtp.mutate({ email });
            setResent(true);
          }}
          disabled={resendOtp.isPending}
          className="font-semibold text-brand-700 hover:underline disabled:opacity-60"
        >
          {t("auth.otp.resend")}
        </button>
        {resent && <p className="mt-1 text-neutral-500">{t("auth.otp.resendSuccess")}</p>}
      </div>
    </Card>
  );
}

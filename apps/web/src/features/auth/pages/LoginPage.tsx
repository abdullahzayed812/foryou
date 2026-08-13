import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { loginSchema, type LoginInput } from "@foryou/shared";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useLogin } from "@/features/auth/hooks";

// Seeded by `npm run db:seed` (see apps/api/src/db/seed.ts) — only ever
// meaningful against a dev database, and `import.meta.env.DEV` is false in
// a production build, so this whole section is compiled out of any real
// deployment rather than just hidden by CSS.
const DEMO_ACCOUNTS = [
  { email: "customer@foryou.dev", labelKey: "auth.login.demoLoginCustomer" },
  { email: "seller@foryou.dev", labelKey: "auth.login.demoLoginSeller" },
  { email: "merchant@foryou.dev", labelKey: "auth.login.demoLoginMerchant" },
  { email: "admin@foryou.dev", labelKey: "auth.login.demoLoginAdmin" },
] as const;
const DEMO_PASSWORD = "Password123";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit((data) => {
    login.mutate(data, { onSuccess: () => void navigate("/dashboard", { replace: true }) });
  });

  function loginAsDemo(email: string) {
    login.mutate(
      { email, password: DEMO_PASSWORD },
      { onSuccess: () => void navigate("/dashboard", { replace: true }) },
    );
  }

  return (
    <Card>
      <h1 className="text-xl font-bold text-neutral-900">{t("auth.login.title")}</h1>
      <p className="mt-1 text-sm text-neutral-600">{t("auth.login.subtitle")}</p>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <ErrorBanner error={login.error} />

        <TextField
          label={t("auth.login.email")}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label={t("auth.login.password")}
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />

        <div className="text-end">
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            {t("auth.login.forgotPassword")}
          </Link>
        </div>

        <Button type="submit" loading={login.isPending}>
          {t("auth.login.submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-600">
        {t("auth.login.noAccount")}{" "}
        <Link to="/register" className="font-semibold text-brand-700 hover:underline">
          {t("auth.login.createAccount")}
        </Link>
      </p>

      {import.meta.env.DEV && (
        <div className="mt-6 border-t border-dashed border-neutral-200 pt-4">
          <p className="text-center text-xs font-medium text-neutral-500">
            {t("auth.login.demoLoginTitle")}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map(({ email, labelKey }) => (
              <Button
                key={email}
                type="button"
                variant="secondary"
                loading={login.isPending}
                onClick={() => loginAsDemo(email)}
              >
                {t(labelKey)}
              </Button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

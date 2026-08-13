import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  emailSchema,
  passwordSchema,
  countryEnum,
  type RegisterSellerInput,
} from "@foryou/shared";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useRegisterSeller } from "@/features/auth/hooks";
import { CountryCheckboxes } from "@/features/auth/CountryCheckboxes";

// `productCategories` still collects as one comma-separated field (no
// matching logic depends on it, unlike importCountries — see
// packages/shared/src/validation/countries.ts) so this local schema — not
// the shared one — is what react-hook-form validates against; onSubmit
// below converts both fields to the real payload shape.
const sellerFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().min(1),
  phoneNumber: z.string().min(1),
  importCountries: z.array(countryEnum).min(1, "Select at least one country"),
  productCategories: z.string().min(1, "List at least one category"),
  facebookPage: z.string().optional(),
  instagramPage: z.string().optional(),
});
type SellerFormInput = z.infer<typeof sellerFormSchema>;

function toList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function RegisterSellerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const registerSeller = useRegisterSeller();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SellerFormInput>({ resolver: zodResolver(sellerFormSchema) });

  const onSubmit = handleSubmit((data) => {
    const payload: RegisterSellerInput = {
      ...data,
      productCategories: toList(data.productCategories),
      facebookPage: data.facebookPage || undefined,
      instagramPage: data.instagramPage || undefined,
    };
    registerSeller.mutate(payload, {
      onSuccess: (res) => void navigate(`/verify-otp?email=${encodeURIComponent(res.email)}`),
    });
  });

  return (
    <Card>
      <h1 className="text-xl font-bold text-neutral-900">
        {t("auth.register.title", { role: t("roles.seller") })}
      </h1>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <ErrorBanner error={registerSeller.error} />

        <TextField
          label={t("auth.register.fullName")}
          error={errors.fullName?.message}
          {...register("fullName")}
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

        <CountryCheckboxes
          label={t("auth.register.importCountries")}
          register={register}
          name="importCountries"
          error={errors.importCountries?.message}
        />
        <TextField
          label={t("auth.register.productCategories")}
          hint={t("auth.register.productCategoriesHint")}
          error={errors.productCategories?.message}
          {...register("productCategories")}
        />

        <TextField
          label={t("auth.register.facebookPage")}
          type="url"
          error={errors.facebookPage?.message}
          {...register("facebookPage")}
        />
        <TextField
          label={t("auth.register.instagramPage")}
          type="url"
          error={errors.instagramPage?.message}
          {...register("instagramPage")}
        />

        <Button type="submit" loading={registerSeller.isPending}>
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

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  customerProfileFieldsSchema,
  merchantProfileFieldsSchema,
  changePasswordSchema,
  countryEnum,
  COUNTRIES,
  type ChangePasswordInput,
} from "@foryou/shared";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorAlert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSpinner } from "@/components/ui/Spinner";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import {
  useMe,
  useMyTrustBadge,
  useUpdateCustomerProfile,
  useUpdateSellerProfile,
  useUpdateMerchantProfile,
  useChangePassword,
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
} from "@/features/auth/hooks";
import {
  IdentityVerificationCard,
  BusinessVerificationCard,
} from "@/features/verification/VerificationCard";
import { CountryCheckboxes } from "@/features/auth/CountryCheckboxes";
import type { MeResponse } from "@/features/auth/api";

const TRUST_TONE = {
  excellent: "success",
  good: "brand",
  average: "neutral",
  low: "warning",
} as const;

function AccountOverviewCard({ me }: { me: MeResponse }) {
  const { t } = useTranslation();
  const { data: trust } = useMyTrustBadge();

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">{t("profile.title")}</h1>
          <p className="mt-1 text-sm text-neutral-600">{me.email}</p>
        </div>
        <Badge tone={me.status === "active" ? "success" : "danger"}>
          {t(`accountStatus.${me.status}`)}
        </Badge>
      </div>
      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="font-medium text-neutral-500">{t("dashboard.yourRoles")}</dt>
          <dd className="mt-1 flex flex-wrap gap-1">
            {me.roles.map((r) => (
              <span
                key={r}
                className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700"
              >
                {t(`roles.${r}`)}
              </span>
            ))}
          </dd>
        </div>
        {trust && (
          <div>
            <dt className="font-medium text-neutral-500">{t("dashboard.trustLevel")}</dt>
            <dd className="mt-1">
              <Badge tone={TRUST_TONE[trust.level]}>{t(`trustLevel.${trust.level}`)}</Badge>
            </dd>
          </div>
        )}
        <div>
          <dt className="font-medium text-neutral-500">{t("profile.memberSince")}</dt>
          <dd className="mt-1 text-neutral-700">{new Date(me.createdAt).toLocaleDateString()}</dd>
        </div>
      </dl>
    </Card>
  );
}

function CustomerProfileForm({ profile }: { profile: NonNullable<MeResponse["customerProfile"]> }) {
  const { t } = useTranslation();
  const update = useUpdateCustomerProfile();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof customerProfileFieldsSchema>>({
    resolver: zodResolver(customerProfileFieldsSchema),
    values: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      governorate: profile.governorate,
      city: profile.city,
      mobileNumber: profile.mobileNumber ?? undefined,
    },
  });

  const onSubmit = handleSubmit((data) => update.mutate(data));

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-neutral-900">
        {t("profile.personalInfo", { role: t("roles.customer") })}
      </h2>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <ErrorAlert error={update.error} />
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
        <Button type="submit" fullWidth={false} loading={update.isPending}>
          {update.isSuccess ? t("profile.saved") : t("common.save")}
        </Button>
      </form>
    </Card>
  );
}

// Mirrors RegisterSellerPage: productCategories is still edited as one
// comma-separated field until there's a proper chip/tag input — importCountries
// isn't, since it feeds real matching logic (see countries.ts) and needs a
// fixed set of values, not free text.
const sellerFormSchema = z.object({
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

function SellerProfileForm({ profile }: { profile: NonNullable<MeResponse["sellerProfile"]> }) {
  const { t } = useTranslation();
  const update = useUpdateSellerProfile();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SellerFormInput>({
    resolver: zodResolver(sellerFormSchema),
    values: {
      fullName: profile.fullName,
      phoneNumber: profile.phoneNumber,
      importCountries: profile.importCountries,
      productCategories: profile.productCategories.join(", "),
      facebookPage: profile.facebookPage ?? "",
      instagramPage: profile.instagramPage ?? "",
    },
  });

  const onSubmit = handleSubmit((data) =>
    update.mutate({
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      importCountries: data.importCountries,
      productCategories: toList(data.productCategories),
      facebookPage: data.facebookPage || undefined,
      instagramPage: data.instagramPage || undefined,
    }),
  );

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-neutral-900">
        {t("profile.personalInfo", { role: t("roles.seller") })}
      </h2>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <ErrorAlert error={update.error} />
        <TextField
          label={t("auth.register.fullName")}
          error={errors.fullName?.message}
          {...register("fullName")}
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
        <Button type="submit" fullWidth={false} loading={update.isPending}>
          {update.isSuccess ? t("profile.saved") : t("common.save")}
        </Button>
      </form>
    </Card>
  );
}

function MerchantProfileForm({ profile }: { profile: NonNullable<MeResponse["merchantProfile"]> }) {
  const { t } = useTranslation();
  const update = useUpdateMerchantProfile();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof merchantProfileFieldsSchema>>({
    resolver: zodResolver(merchantProfileFieldsSchema),
    values: { ...profile },
  });

  const onSubmit = handleSubmit((data) => update.mutate(data));

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-neutral-900">
        {t("profile.personalInfo", { role: t("roles.merchant") })}
      </h2>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <ErrorAlert error={update.error} />
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
          {COUNTRIES.map((code) => (
            <option key={code} value={code}>
              {t(`countries.${code}`)}
            </option>
          ))}
        </Select>
        <Button type="submit" fullWidth={false} loading={update.isPending}>
          {update.isSuccess ? t("profile.saved") : t("common.save")}
        </Button>
      </form>
    </Card>
  );
}

function PasswordChangeForm() {
  const { t } = useTranslation();
  const changePassword = useChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = handleSubmit((data) => {
    changePassword.mutate(data, { onSuccess: () => reset() });
  });

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-neutral-900">{t("profile.password.title")}</h2>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <ErrorAlert error={changePassword.error} />
        <TextField
          label={t("profile.password.current")}
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register("currentPassword")}
        />
        <TextField
          label={t("profile.password.new")}
          type="password"
          autoComplete="new-password"
          hint={t("auth.register.passwordHint")}
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <Button type="submit" fullWidth={false} loading={changePassword.isPending}>
          {changePassword.isSuccess ? t("profile.saved") : t("profile.password.submit")}
        </Button>
      </form>
    </Card>
  );
}

// Local schema (not the shared createAddressSchema): the checkbox always
// submits a real boolean, so `isDefault` is required here rather than
// optional-with-default — sidesteps a zodResolver input/output type mismatch
// on schemas using `.optional().default()`.
const addressFormSchema = z.object({
  label: z.string().min(1).max(50),
  governorate: z.string().min(1),
  city: z.string().min(1),
  addressLine: z.string().min(1).max(300),
  isDefault: z.boolean(),
});
type AddressFormInput = z.infer<typeof addressFormSchema>;

function AddressesCard() {
  const { t } = useTranslation();
  const { data: addresses, isLoading } = useAddresses();
  const createAddress = useCreateAddress();
  const deleteAddress = useDeleteAddress();
  const [showForm, setShowForm] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressFormInput>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: { label: "", governorate: "", city: "", addressLine: "", isDefault: false },
  });

  const onSubmit = handleSubmit((data) => {
    createAddress.mutate(data, {
      onSuccess: () => {
        reset();
        setShowForm(false);
      },
    });
  });

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">{t("profile.addresses.title")}</h2>
        <Button variant="ghost" fullWidth={false} onClick={() => setShowForm((v) => !v)}>
          {showForm ? t("common.cancel") : t("profile.addresses.add")}
        </Button>
      </div>

      {isLoading && <PageSpinner />}
      {addresses && addresses.length === 0 && !showForm && (
        <EmptyState title={t("profile.addresses.empty")} />
      )}

      {addresses && addresses.length > 0 && (
        <div className="flex flex-col gap-2">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-2"
            >
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                  {address.label}
                  {address.isDefault && (
                    <Badge tone="brand">{t("profile.addresses.default")}</Badge>
                  )}
                </p>
                <p className="text-sm text-neutral-600">
                  {address.addressLine}, {address.city}, {address.governorate}
                </p>
              </div>
              <Button
                variant="ghost"
                fullWidth={false}
                loading={deleteAddress.isPending}
                onClick={() => deleteAddress.mutate(address.id)}
              >
                {t("common.remove")}
              </Button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 border-t border-neutral-200 pt-4">
          <ErrorAlert error={createAddress.error} />
          <TextField
            label={t("profile.addresses.label")}
            error={errors.label?.message}
            {...register("label")}
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
            label={t("profile.addresses.addressLine")}
            error={errors.addressLine?.message}
            {...register("addressLine")}
          />
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" {...register("isDefault")} />
            {t("profile.addresses.setDefault")}
          </label>
          <Button type="submit" fullWidth={false} loading={createAddress.isPending}>
            {t("profile.addresses.save")}
          </Button>
        </form>
      )}
    </Card>
  );
}

export function ProfilePage() {
  const { t } = useTranslation();
  const { data: me, isLoading } = useMe();

  if (isLoading || !me) return <PageSpinner />;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <AccountOverviewCard me={me} />

      {me.customerProfile && <CustomerProfileForm profile={me.customerProfile} />}
      {me.sellerProfile && <SellerProfileForm profile={me.sellerProfile} />}
      {me.merchantProfile && <MerchantProfileForm profile={me.merchantProfile} />}

      {me.roles.includes("customer") && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-neutral-900">
            {t("profile.verification.title")}
          </h2>
          <IdentityVerificationCard />
        </div>
      )}

      {me.roles.includes("seller") && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">
            {t("profile.verification.title")}
          </h2>
          <IdentityVerificationCard />
          <BusinessVerificationCard />
        </div>
      )}

      {me.roles.includes("merchant") && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">
            {t("profile.verification.title")}
          </h2>
          <p className="text-sm text-neutral-600">{t("profile.verification.manageHint")}</p>
          <Link to="/merchants/me/verification">
            <Button variant="secondary" fullWidth={false}>
              {t("roles.merchant")}
            </Button>
          </Link>
        </Card>
      )}

      {me.roles.includes("customer") && <AddressesCard />}

      <PasswordChangeForm />

      <Card className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">{t("profile.language")}</h2>
        <LanguageSwitcher />
      </Card>
    </div>
  );
}

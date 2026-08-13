import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useAdminSettings,
  useUpdateSettings,
  useCommissionRates,
  useSetCommissionRate,
} from "@/features/admin/hooks";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Select } from "@/components/ui/Select";
import { ErrorAlert } from "@/components/ui/Alert";
import { PageSpinner } from "@/components/ui/Spinner";
import type { PlatformSettings } from "@/features/admin/types";

/** Initializes its fields straight from the already-loaded `settings` prop — no effect needed to sync fetched data into local state. */
function SettingsForm({ settings }: { settings: PlatformSettings }) {
  const { t } = useTranslation();
  const update = useUpdateSettings();
  const [maintenanceMode, setMaintenanceMode] = useState(settings.maintenanceMode);
  const [platformAnnouncement, setPlatformAnnouncement] = useState(settings.platformAnnouncement);
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail);
  const [minWithdrawalAmount, setMinWithdrawalAmount] = useState(
    String(settings.minWithdrawalAmount),
  );

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-neutral-900">
        {t("admin.settings.platformTitle")}
      </h2>
      <ErrorAlert error={update.error} />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={maintenanceMode}
          onChange={(e) => setMaintenanceMode(e.target.checked)}
        />
        {t("admin.settings.maintenanceMode")}
      </label>

      <TextField
        label={t("admin.settings.supportEmail")}
        type="email"
        value={supportEmail}
        onChange={(e) => setSupportEmail(e.target.value)}
      />
      <TextField
        label={t("admin.settings.minWithdrawalAmount")}
        type="number"
        min={0}
        value={minWithdrawalAmount}
        onChange={(e) => setMinWithdrawalAmount(e.target.value)}
      />
      <TextField
        label={t("admin.settings.platformAnnouncement")}
        value={platformAnnouncement}
        onChange={(e) => setPlatformAnnouncement(e.target.value)}
      />

      <Button
        fullWidth={false}
        loading={update.isPending}
        onClick={() =>
          update.mutate({
            maintenanceMode,
            platformAnnouncement,
            supportEmail,
            minWithdrawalAmount: Number(minWithdrawalAmount),
          })
        }
      >
        {t("common.save")}
      </Button>
    </Card>
  );
}

function SettingsPanel() {
  const { data: settings, isLoading } = useAdminSettings();
  if (isLoading || !settings) return <PageSpinner />;
  return <SettingsForm settings={settings} />;
}

function CommissionRatesPanel() {
  const { t } = useTranslation();
  const { data: rates } = useCommissionRates();
  const setRate = useSetCommissionRate();
  const [role, setRole] = useState<"seller" | "merchant">("seller");
  const [percentage, setPercentage] = useState("");

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-neutral-900">
        {t("admin.settings.commissionRates")}
      </h2>
      <ErrorAlert error={setRate.error} />

      <div className="flex flex-wrap gap-2">
        {rates?.map((r) => (
          <span key={r.role} className="rounded-full bg-neutral-100 px-3 py-1 text-sm">
            {t(`roles.${r.role}`)}: {Number(r.percentage)}%
          </span>
        ))}
      </div>

      <div className="flex items-end gap-2">
        <div className="w-40">
          <Select
            label={t("admin.settings.role")}
            value={role}
            onChange={(e) => setRole(e.target.value as "seller" | "merchant")}
          >
            <option value="seller">{t("roles.seller")}</option>
            <option value="merchant">{t("roles.merchant")}</option>
          </Select>
        </div>
        <div className="flex-1">
          <TextField
            label={t("admin.settings.newPercentage")}
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
          />
        </div>
        <Button
          fullWidth={false}
          loading={setRate.isPending}
          disabled={!percentage}
          onClick={() =>
            setRate.mutate(
              { role, percentage: Number(percentage) },
              { onSuccess: () => setPercentage("") },
            )
          }
        >
          {t("common.save")}
        </Button>
      </div>
    </Card>
  );
}

export function AdminSettingsPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">{t("admin.settings.title")}</h1>
      <SettingsPanel />
      <CommissionRatesPanel />
    </div>
  );
}

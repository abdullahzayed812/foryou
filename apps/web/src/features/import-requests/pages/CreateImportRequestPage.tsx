import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createImportRequestSchema, isImportDescriptionAllowed, COUNTRIES } from "@foryou/shared";
import { Card } from "@/components/ui/Card";
import { TextArea } from "@/components/ui/TextArea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/Alert";
import { LinkSourcePreview } from "@/components/ui/LinkSourcePreview";
import { useCreateImportRequest } from "@/features/import-requests/hooks";

export function CreateImportRequestPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useCreateImportRequest();

  const [linksText, setLinksText] = useState("");
  const [preferences, setPreferences] = useState("");
  const [sourceCountry, setSourceCountry] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const linkLines = linksText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Live, as-you-type check — cheap pure function, no need to wait for blur.
  // Same rule the backend re-checks in createImportRequestSchema (shared
  // validator), this is just the friendly, field-local copy of it.
  const preferencesError =
    preferences.trim() && !isImportDescriptionAllowed(preferences)
      ? t("importRequests.create.priceWarning")
      : undefined;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (preferencesError) {
      setValidationError(preferencesError);
      return;
    }

    const parsed = createImportRequestSchema.safeParse({
      links: linkLines,
      notes: preferences ? { preferences } : undefined,
      sourceCountry: sourceCountry || undefined,
    });

    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? t("errors.VALIDATION_FAILED"));
      return;
    }

    create.mutate(parsed.data, {
      onSuccess: (request) => void navigate(`/import-requests/${request.id}`),
    });
  }

  return (
    <Card className="mx-auto max-w-xl">
      <h1 className="text-xl font-bold text-neutral-900">{t("importRequests.create.title")}</h1>
      <p className="mt-1 text-sm text-neutral-600">{t("importRequests.create.subtitle")}</p>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <ErrorAlert error={create.error} />
        {validationError && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {validationError}
          </div>
        )}

        <TextArea
          label={t("importRequests.create.links")}
          hint={t("importRequests.create.linksHint")}
          rows={5}
          value={linksText}
          onChange={(e) => setLinksText(e.target.value)}
          required
        />

        {linkLines.length > 0 && (
          <div className="flex flex-col gap-2">
            {linkLines.map((line, i) => (
              <LinkSourcePreview key={i} url={line} />
            ))}
          </div>
        )}

        <Select
          label={t("importRequests.create.sourceCountry")}
          hint={t("importRequests.create.sourceCountryHint")}
          value={sourceCountry}
          onChange={(e) => setSourceCountry(e.target.value)}
        >
          <option value="">{t("importRequests.create.anyCountry")}</option>
          {COUNTRIES.map((code) => (
            <option key={code} value={code}>
              {t(`countries.${code}`)}
            </option>
          ))}
        </Select>

        <TextArea
          label={t("importRequests.create.preferences")}
          hint={t("importRequests.create.preferencesHint")}
          error={preferencesError}
          rows={3}
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
        />

        <Button type="submit" loading={create.isPending}>
          {t("importRequests.create.submit")}
        </Button>
      </form>
    </Card>
  );
}

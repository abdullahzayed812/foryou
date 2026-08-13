import type { FieldValues, Path, UseFormRegister } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { COUNTRIES } from "@foryou/shared";

interface CountryCheckboxesProps<T extends FieldValues> {
  label: string;
  hint?: string;
  register: UseFormRegister<T>;
  name: Path<T>;
  error?: string;
}

/** A seller's `importCountries` field, rendered from the same canonical
 * country list a customer's import request picks `sourceCountry` from — see
 * packages/shared/src/validation/countries.ts for why this must be a fixed
 * set instead of free text. */
export function CountryCheckboxes<T extends FieldValues>({
  label,
  hint,
  register,
  name,
  error,
}: CountryCheckboxesProps<T>) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-neutral-700">{label}</label>
      {hint && !error && <p className="text-xs text-neutral-500">{hint}</p>}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-neutral-200 bg-white p-3.5 shadow-soft sm:grid-cols-3">
        {COUNTRIES.map((code) => (
          <label key={code} className="flex items-center gap-2 text-sm text-neutral-800">
            <input type="checkbox" value={code} {...register(name)} />
            {t(`countries.${code}`)}
          </label>
        ))}
      </div>
      {error && (
        <p className="text-xs text-danger-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

import { z } from "zod";

/**
 * Canonical country codes — the single source of truth for both a
 * customer's import request `sourceCountry` and a seller's `importCountries`
 * profile field. Both used to be independent free-text inputs with no shared
 * list, so a customer typing "Turkey" and a seller typing "turkey" (or the
 * Arabic-UI equivalent "تركيا") would never match in the DB's exact-string
 * `= ANY(...)` comparison — a request could silently reach zero sellers with
 * no error anywhere. A fixed set of codes, rendered as translated labels on
 * both forms (see the `countries.*` i18n namespace), makes that mismatch
 * structurally impossible instead of just less likely.
 */
export const COUNTRIES = [
  "china",
  "turkey",
  "usa",
  "uk",
  "germany",
  "france",
  "italy",
  "spain",
  "netherlands",
  "uae",
  "saudi_arabia",
  "kuwait",
  "qatar",
  "bahrain",
  "oman",
  "jordan",
  "japan",
  "south_korea",
  "india",
  "canada",
] as const;
export type CountryCode = (typeof COUNTRIES)[number];
export const countryEnum = z.enum(COUNTRIES);

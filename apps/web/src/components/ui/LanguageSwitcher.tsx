import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const next = i18n.resolvedLanguage === "ar" ? "en" : "ar";
  const label = next === "ar" ? "العربية" : "English";

  return (
    <button
      type="button"
      onClick={() => void i18n.changeLanguage(next)}
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900"
    >
      {label}
    </button>
  );
}

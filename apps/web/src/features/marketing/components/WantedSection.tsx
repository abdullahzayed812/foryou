import { useTranslation } from "react-i18next";
import { useReveal, revealClass } from "../hooks/useReveal";

export function WantedSection() {
  const { t } = useTranslation();
  const [ref, visible] = useReveal<HTMLDivElement>();

  return (
    <section className="lp-wanted-section">
      <div ref={ref} className={`lp-wanted-inner ${revealClass(visible)}`}>
        <span className="lp-wanted-badge">{t("landing.wanted.badge")}</span>
        <h2>{t("landing.wanted.title")}</h2>
        <p>{t("landing.wanted.body")}</p>
      </div>
    </section>
  );
}

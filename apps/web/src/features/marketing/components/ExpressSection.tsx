import { useTranslation } from "react-i18next";
import { useReveal, revealClass } from "../hooks/useReveal";

export function ExpressSection() {
  const { t } = useTranslation();
  const [ref, visible] = useReveal<HTMLDivElement>();

  return (
    <section className="lp-express-section">
      <div ref={ref} className={`lp-express-inner ${revealClass(visible)}`}>
        <span className="lp-express-badge">{t("landing.express.badge")}</span>
        <h2>{t("landing.express.title")}</h2>
        <p>{t("landing.express.body")}</p>
      </div>
    </section>
  );
}

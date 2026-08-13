import { useTranslation } from "react-i18next";
import type { MarketplaceRole } from "@foryou/shared";
import { useReveal, revealClass } from "../hooks/useReveal";

export function BenefitsSection({ role }: { role: MarketplaceRole }) {
  const { t } = useTranslation();
  const [ref, visible] = useReveal<HTMLHeadingElement>();
  const benefits = t(`landing.benefits.${role}`, { returnObjects: true }) as {
    icon: string;
    label: string;
  }[];

  return (
    <section className="lp-benefits-section">
      <div className="lp-benefits-inner">
        <h2 ref={ref} className={revealClass(visible)}>
          {t("landing.benefits.title")}
        </h2>
        <div className="lp-benefits-grid">
          {benefits.map((b) => (
            <div key={b.label} className="lp-benefit-card">
              <div className="lp-icon">{b.icon}</div>
              <p>{b.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

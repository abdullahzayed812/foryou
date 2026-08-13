import { useTranslation } from "react-i18next";
import type { MarketplaceRole } from "@foryou/shared";
import { useReveal, revealClass } from "../hooks/useReveal";

export function StepsSection({ role }: { role: MarketplaceRole }) {
  const { t } = useTranslation();
  const [ref, visible] = useReveal<HTMLHeadingElement>();
  const steps = t(`landing.steps.${role}`, { returnObjects: true }) as string[];

  return (
    <section className="lp-steps-section" id="lp-steps">
      <div className="lp-steps-inner">
        <h2 ref={ref} className={revealClass(visible)}>
          {t("landing.steps.title")}
        </h2>
        <div className="lp-steps-grid">
          {steps.map((step, i) => (
            <div key={step} className="lp-step-card">
              <div className="lp-step-num">0{i + 1}</div>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

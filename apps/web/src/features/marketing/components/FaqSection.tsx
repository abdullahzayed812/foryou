import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useReveal, revealClass } from "../hooks/useReveal";

export function FaqSection() {
  const { t } = useTranslation();
  const [headingRef, headingVisible] = useReveal<HTMLHeadingElement>();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const items = t("landing.faq.items", { returnObjects: true }) as { q: string; a: string }[];

  return (
    <section className="lp-faq-section">
      <h2 ref={headingRef} className={revealClass(headingVisible)}>
        {t("landing.faq.title")}
      </h2>
      <div>
        {items.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={item.q} className={`lp-faq-item ${isOpen ? "lp-open" : ""}`}>
              <button
                type="button"
                className="lp-faq-q"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? null : i)}
              >
                <span>{item.q}</span>
                <span className="lp-plus" aria-hidden="true">
                  +
                </span>
              </button>
              <div className="lp-faq-a">
                <div>
                  <p>{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

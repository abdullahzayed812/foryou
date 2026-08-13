import { useEffect, useRef, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { useReveal, revealClass } from "../hooks/useReveal";

/** Observes the container once and flags "triggered" — each child then
 * staggers in via its own `transitionDelay`, matching the reference's
 * per-item `data-d` stagger without needing one observer per bubble. Tuple
 * return for the same reason as `useReveal` — see its comment. */
function useStaggerReveal<T extends HTMLElement>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setTriggered(true);
          io.unobserve(el);
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, triggered];
}

export function CompareSection() {
  const { t } = useTranslation();
  const [headingRef, headingVisible] = useReveal<HTMLDivElement>();
  const [oldColRef, oldTriggered] = useStaggerReveal<HTMLDivElement>();
  const [newColRef, newTriggered] = useStaggerReveal<HTMLDivElement>();

  const oldMessages = t("landing.compare.oldMessages", { returnObjects: true }) as string[];
  const offers = t("landing.compare.offers", { returnObjects: true }) as {
    label: string;
    price: string;
    best?: boolean;
  }[];

  return (
    <section className="lp-compare-section">
      <div ref={headingRef} className={revealClass(headingVisible)}>
        <h2>{t("landing.compare.title")}</h2>
        <p className="lp-lead">{t("landing.compare.subtitle")}</p>
      </div>

      <div className="lp-compare-grid">
        <div ref={oldColRef} className="lp-compare-col lp-old">
          <h3>{t("landing.compare.oldLabel")}</h3>
          {oldMessages.map((msg, i) => (
            <div
              key={msg}
              className={`lp-chat-bubble ${i % 2 === 1 ? "lp-tint2" : ""} ${i === 2 ? "lp-me" : ""} ${oldTriggered ? "lp-in" : ""}`}
              style={{ transitionDelay: `${i * 250}ms` }}
            >
              {msg}
            </div>
          ))}
        </div>

        <div ref={newColRef} className="lp-compare-col lp-new">
          <h3 style={{ color: "var(--lp-mint)" }}>{t("landing.compare.newLabel")}</h3>
          {offers.map((offer, i) => (
            <div
              key={offer.label}
              className={`lp-offer-card ${offer.best ? "lp-best" : ""} ${newTriggered ? "lp-in" : ""}`}
              style={{ transitionDelay: `${i * 250}ms` }}
            >
              <span>{offer.label}</span>
              <span className="lp-price">{offer.price}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="lp-compare-tagline">
        {t("landing.compare.taglineStart")}
        <span className="lp-emphasis">{t("landing.compare.taglineEmphasis")}</span>
      </p>
    </section>
  );
}

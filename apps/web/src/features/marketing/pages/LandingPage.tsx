import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { MarketplaceRole } from "@foryou/shared";
import "@fontsource/cairo/600.css";
import "@fontsource/cairo/700.css";
import "@fontsource/cairo/800.css";
import "@fontsource/cairo/900.css";
import "@fontsource/tajawal/300.css";
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/500.css";
import "@fontsource/tajawal/700.css";
import "./LandingPage.css";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useReveal, revealClass } from "../hooks/useReveal";
import { IntroOverlay } from "../components/IntroOverlay";
import { RoleSelectSection } from "../components/RoleSelectSection";
import { StepsSection } from "../components/StepsSection";
import { CompareSection } from "../components/CompareSection";
import { BenefitsSection } from "../components/BenefitsSection";
import { ExpressSection } from "../components/ExpressSection";
import { GetStartedSection } from "../components/GetStartedSection";
import { FaqSection } from "../components/FaqSection";
import { WhatsAppIcon } from "@/components/ui/icons";

const PARTICLE_COUNT = 18;

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

/** Purely decorative, non-reactive background motion — injected straight into
 * the DOM (matching how the reference's own vanilla-JS `initParticles()`
 * builds these) rather than modeled as React state, since there is nothing
 * here that ever needs to trigger a re-render. */
function Particles() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const nodes: HTMLSpanElement[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const span = document.createElement("span");
      span.className = "lp-particle";
      span.style.left = `${Math.random() * 100}%`;
      span.style.top = `${Math.random() * 100}%`;
      span.style.animationDelay = `${Math.random() * 6}s`;
      span.style.animationDuration = `${6 + Math.random() * 5}s`;
      el.appendChild(span);
      nodes.push(span);
    }
    return () => {
      for (const node of nodes) node.remove();
    };
  }, []);

  return <div ref={ref} className="lp-particles" aria-hidden="true" />;
}

export function LandingPage() {
  const { t } = useTranslation();
  const [introDone, setIntroDone] = useState(false);
  const [role, setRole] = useState<MarketplaceRole>("customer");
  const [heroRef, heroVisible] = useReveal<HTMLDivElement>();

  // Scroll-to-section anchors (hero CTA, "learn more", final CTA) rely on
  // native smooth scrolling; scoped to this page's lifetime only, not a
  // permanent document-wide change for every other route.
  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = prev;
    };
  }, []);

  return (
    <div className="lp">
      {!introDone && <IntroOverlay onComplete={() => setIntroDone(true)} />}

      <div className={`lp-main ${introDone ? "lp-show" : ""}`}>
        <nav className="lp-nav">
          <div className="lp-logo-small">
            <img src="/logo.svg" alt={t("common.appName")} style={{ height: "72px", width: "auto" }} />
          </div>
          <div className="lp-nav-actions">
            {/* <Link to="/login" className="lp-nav-link">
              {t("landing.nav.signIn")}
            </Link> */}
            <LanguageSwitcher />
            {/* <button
              type="button"
              className="lp-nav-btn"
              onClick={() => scrollToId("lp-get-started")}
            >
              {t("landing.hero.cta")}
            </button> */}
          </div>
        </nav>

        <section className="lp-hero">
          <Particles />
          <div ref={heroRef} className={`lp-hero-content ${revealClass(heroVisible)}`}>
            <span className="lp-eyebrow">{t("landing.hero.eyebrow")}</span>
            <h1>{t("landing.hero.title")}</h1>
            <p className="lp-sub">{t("landing.hero.subtitle")}</p>
            <div className="lp-btn-row">
              {/* <button
                type="button"
                className="lp-btn-primary"
                onClick={() => scrollToId("lp-role-select")}
              >
                {t("landing.hero.cta")}
              </button> */}
            </div>
            <button type="button" className="lp-link-more" onClick={() => scrollToId("lp-steps")}>
              {t("landing.nav.learnMore")} ↓
            </button>
          </div>
        </section>

        {/* WhatsApp Floating Button */}
        <a
          href="https://wa.me/201104198388"
          className="lp-whatsapp-float"
          target="_blank"
          rel="noopener noreferrer"
        >
          <WhatsAppIcon />
        </a>

        <RoleSelectSection selectedRole={role} onSelectRole={setRole} />
        <StepsSection role={role} />
        <CompareSection />
        <BenefitsSection role={role} />
        <ExpressSection />
        <GetStartedSection />
        <FaqSection />

        {/* <section className="lp-final-cta"> */}
        {/* <h2>{t("landing.finalCta.title")}</h2> */}
        {/* <button
            type="button"
            className="lp-btn-primary"
            onClick={() => scrollToId("lp-get-started")}
          >
            🚀 {t("landing.hero.cta")}
          </button> */}
        {/* </section> */}

        <section className="lp-whatsapp-cta" style={{ textAlign: "center", padding: "60px 24px" }}>
          <a
            href="https://wa.me/201104198388"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "18px",
              fontWeight: "700",
              color: "var(--lp-primary)",
              textDecoration: "none"
            }}
          >
            {t("landing.whatsappQuestions")}
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "#25d366",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(37, 211, 102, 0.4)"
            }}>
              <WhatsAppIcon style={{ stroke: "white", fill: "none", width: "24px", height: "24px" }} />
            </div>
          </a>
        </section>

        <footer className="lp-footer">{t("landing.footer")}</footer>
      </div>
    </div>
  );
}

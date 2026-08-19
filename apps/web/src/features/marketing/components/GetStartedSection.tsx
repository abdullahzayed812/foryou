import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { MarketplaceRole } from "@foryou/shared";
import { useReveal, revealClass } from "../hooks/useReveal";

interface GetStartedSectionProps {
  role: MarketplaceRole;
  onSelectRole: (role: MarketplaceRole) => void;
}

const ROLES: MarketplaceRole[] = ["customer", "seller", "merchant"];

/** Visually the reference's waitlist panel, but functionally a real signup
 * gateway — the app already has working registration, so a fake waitlist
 * form here would be a regression rather than fidelity to the reference. */
export function GetStartedSection({ role, onSelectRole }: GetStartedSectionProps) {
  const { t } = useTranslation();
  const [ref, visible] = useReveal<HTMLDivElement>();

  return (
    <section className="lp-get-started-section" id="lp-get-started">
      <div ref={ref} className={`lp-get-started-box ${revealClass(visible)}`}>
        <h2>{t("landing.getStarted.title")}</h2>
        <p className="lp-sub">{t("landing.getStarted.subtitle")}</p>

        <div className="lp-role-toggle-row">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onSelectRole(r)}
              aria-pressed={role === r}
              className={`lp-role-toggle-btn ${role === r ? "lp-active" : ""}`}
            >
              {t(`roles.${r}`)}
            </button>
          ))}
        </div>

        {/* <Link to={`/register/${role}`} className="lp-btn-primary">
          {t("landing.getStarted.cta")}
        </Link> */}

        <p className="lp-get-started-signin">
          {t("landing.alreadyHaveAccount")} <Link to="/login">{t("landing.signIn")}</Link>
        </p>
      </div>
    </section>
  );
}

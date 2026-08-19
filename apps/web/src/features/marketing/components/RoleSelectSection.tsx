import { useTranslation } from "react-i18next";
import type { MarketplaceRole } from "@foryou/shared";
import { useReveal, revealClass } from "../hooks/useReveal";

const ROLE_ICONS: Record<MarketplaceRole, string> = {
  customer: "🛍️",
  seller: "📦",
  merchant: "🏪",
};
// TODO: replace with the real community links.
const ROLE_TELEGRAM_LINKS: Record<MarketplaceRole, string> = {
  customer: "https://t.me/ForYOU_platform",
  seller: "https://t.me/ForYOU_platform",
  merchant: "https://t.me/ForYOU_platform",
};
const ROLES: MarketplaceRole[] = ["customer", "seller", "merchant"];

interface RoleSelectSectionProps {
  selectedRole: MarketplaceRole;
  onSelectRole: (role: MarketplaceRole) => void;
}

export function RoleSelectSection({ selectedRole, onSelectRole }: RoleSelectSectionProps) {
  const { t } = useTranslation();
  const [headingRef, headingVisible] = useReveal<HTMLDivElement>();

  return (
    <section className="lp-role-select" id="lp-role-select">
      <div ref={headingRef} className={revealClass(headingVisible)}>
        <h2>{t("landing.roles.title")}</h2>
        <p className="lp-subtitle">{t("landing.roles.subtitle")}</p>
      </div>

      <div className="lp-role-cards">
        {ROLES.map((role) => (
          <RoleCard
            key={role}
            role={role}
            active={selectedRole === role}
            onSelect={() => onSelectRole(role)}
          />
        ))}
      </div>
    </section>
  );
}

function RoleCard({
  role,
  active,
  onSelect,
}: {
  role: MarketplaceRole;
  active: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const [ref, visible] = useReveal<HTMLDivElement>();
  const body = t(`landing.roles.${role}.body`, { returnObjects: true }) as string[];
  const checks = t(`landing.roles.${role}.checks`, { returnObjects: true }) as string[];

  return (
    <div ref={ref} className={revealClass(visible)}>
      <div className={`lp-role-card ${active ? "lp-active" : ""}`}>
        <button
          type="button"
          onClick={onSelect}
          aria-expanded={active}
          className="lp-role-card-trigger"
        >
          <span className="lp-icon" aria-hidden="true">
            {ROLE_ICONS[role]}
          </span>
          <div className="lp-role-card-heading">
            <h3>{t(`landing.roles.${role}.title`)}</h3>
            <span className="lp-role-card-toggle" aria-hidden="true">
              {active ? "−" : "+"}
            </span>
          </div>
          <p>{body[0]}</p>
        </button>

        <div className="lp-role-card-panel">
          <div>
            <ul className="lp-role-card-body">
              {body.slice(1).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="lp-role-card-intro">{t(`landing.roles.${role}.intro`)}</p>
            <ul className="lp-role-card-checks">
              {checks.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="lp-role-card-cta">{t(`landing.roles.${role}.cta`)}</p>
            <a
              href={ROLE_TELEGRAM_LINKS[role]}
              target="_blank"
              rel="noopener noreferrer"
              className="lp-role-card-telegram"
            >
              📣 {t(`landing.roles.${role}.telegram`)}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

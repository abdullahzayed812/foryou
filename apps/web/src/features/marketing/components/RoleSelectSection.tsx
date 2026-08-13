import { useTranslation } from "react-i18next";
import type { MarketplaceRole } from "@foryou/shared";
import { useReveal, revealClass } from "../hooks/useReveal";

const ROLE_ICONS: Record<MarketplaceRole, string> = {
  customer: "🛍️",
  seller: "📦",
  merchant: "🏪",
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
  const teaser = t(`landing.roles.${role}.body.0`);

  return (
    <div ref={ref} className={revealClass(visible)}>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className={`lp-role-card ${active ? "lp-active" : ""}`}
      >
        <span className="lp-icon" aria-hidden="true">
          {ROLE_ICONS[role]}
        </span>
        <h3>{t(`landing.roles.${role}.title`)}</h3>
        <p>{teaser}</p>
      </button>
    </div>
  );
}

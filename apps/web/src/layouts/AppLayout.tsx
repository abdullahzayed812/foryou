import { useEffect, useState } from "react";
import { Outlet, Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Role } from "@foryou/shared";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { MenuIcon, CloseIcon } from "@/components/ui/icons";
import { useLogout, useMe } from "@/features/auth/hooks";
import { useActiveRoleStore } from "@/features/auth/active-role-store";
import { NotificationsBell } from "@/features/notifications/NotificationsBell";
import { useNotificationSocket } from "@/features/notifications/socket";

const NAV_LINKS_BY_ROLE: Record<Role, { to: string; key: string }[]> = {
  customer: [
    { to: "/dashboard", key: "nav.home" },
    { to: "/products", key: "nav.browse" },
    { to: "/import-requests", key: "nav.importRequests" },
    { to: "/orders", key: "nav.orders" },
    { to: "/wishlist", key: "nav.wishlist" },
    { to: "/reviews", key: "nav.reviews" },
    { to: "/disputes", key: "nav.disputes" },
    { to: "/news", key: "nav.news" },
    { to: "/profile", key: "nav.profile" },
  ],
  seller: [
    { to: "/dashboard", key: "nav.home" },
    { to: "/sellers/me/verification", key: "nav.verification" },
    { to: "/sellers/me/products", key: "nav.myProducts" },
    { to: "/sellers/me/import-requests", key: "nav.requestQueue" },
    { to: "/sellers/me/offers", key: "nav.myOffers" },
    { to: "/sellers/me/orders", key: "nav.orders" },
    { to: "/sellers/me/wallet", key: "nav.wallet" },
    { to: "/sellers/me/reviews", key: "nav.reviews" },
    { to: "/sellers/me/disputes", key: "nav.disputes" },
    { to: "/profile", key: "nav.profile" },
  ],
  merchant: [
    { to: "/dashboard", key: "nav.home" },
    { to: "/merchants/me/verification", key: "nav.verification" },
    { to: "/merchants/me/products", key: "nav.myProducts" },
    { to: "/merchants/me/orders", key: "nav.orders" },
    { to: "/merchants/me/wallet", key: "nav.wallet" },
    { to: "/merchants/me/reviews", key: "nav.reviews" },
    { to: "/merchants/me/disputes", key: "nav.disputes" },
    { to: "/profile", key: "nav.profile" },
  ],
  admin: [
    { to: "/dashboard", key: "nav.home" },
    { to: "/admin/stats", key: "nav.stats" },
    { to: "/admin/verification-queue", key: "nav.verificationQueue" },
    { to: "/admin/products-queue", key: "nav.moderationQueue" },
    { to: "/admin/disputes-queue", key: "nav.disputesQueue" },
    { to: "/admin/reviews", key: "nav.reviewsQueue" },
    { to: "/admin/withdrawals", key: "nav.withdrawals" },
    { to: "/admin/users", key: "nav.users" },
    { to: "/admin/catalog", key: "nav.catalog" },
    { to: "/admin/news", key: "nav.news" },
    { to: "/admin/settings", key: "nav.settings" },
  ],
};

export function AppLayout() {
  const { t } = useTranslation();
  const logout = useLogout();
  const { data: me } = useMe();
  const activeRole = useActiveRoleStore((s) => s.activeRole);
  const setActiveRole = useActiveRoleStore((s) => s.setActiveRole);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  useNotificationSocket();

  useEffect(() => {
    if (!activeRole && me?.roles.length) setActiveRole(me.roles[0] as Role);
  }, [activeRole, me, setActiveRole]);

  // Closing the mobile menu on navigation is "adjust state during render,"
  // not a side effect syncing with an external system — React's own escape
  // hatch for this (https://react.dev/learn/you-might-not-need-an-effect)
  // instead of a useEffect keyed on the path.
  const [prevPathname, setPrevPathname] = useState(location.pathname);
  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname);
    setMobileOpen(false);
  }

  const role = activeRole ?? me?.roles[0] ?? "customer";
  const navLinks = NAV_LINKS_BY_ROLE[role];

  const roleSwitcher = me && me.roles.length > 1 && (
    <select
      value={role}
      onChange={(e) => setActiveRole(e.target.value as Role)}
      className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm shadow-soft outline-none transition-all duration-150 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
      aria-label={t("nav.switchRole")}
    >
      {me.roles.map((r) => (
        <option key={r} value={r}>
          {t(`roles.${r}`)}
        </option>
      ))}
    </select>
  );

  return (
    <div className="flex min-h-full flex-col bg-neutral-50">
      <header className="sticky top-0 z-30 border-b border-neutral-200/70 bg-white/80 px-6 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <Link
            to="/dashboard"
            className="font-display text-gradient-brand text-lg font-extrabold tracking-tight"
          >
            {t("common.appName")}
          </Link>

          {/* Desktop: everything inline. Below md, this whole cluster (except
              the bell) moves into the collapsible panel to keep the header
              from wrapping into a jumbled multi-row mess on small screens. */}
          <div className="hidden items-center gap-2 md:flex">
            {roleSwitcher}
            <NotificationsBell />
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => logout.mutate()}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900"
            >
              {t("common.logout")}
            </button>
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <NotificationsBell />
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-panel"
              aria-label={mobileOpen ? t("nav.closeMenu") : t("nav.openMenu")}
              className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900"
            >
              {mobileOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <nav className="mx-auto mt-3 hidden max-w-[1400px] flex-wrap gap-1 md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/dashboard"}
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-gradient-to-r from-brand-50 to-accent-50 text-brand-700 shadow-soft ring-1 ring-brand-200/60"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }`
              }
            >
              {t(link.key)}
            </NavLink>
          ))}
        </nav>

        {mobileOpen && (
          <nav
            id="mobile-nav-panel"
            className="mx-auto mt-3 flex max-w-[1400px] flex-col gap-1 border-t border-neutral-200/70 pt-3 md:hidden"
          >
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/dashboard"}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-gradient-to-r from-brand-50 to-accent-50 text-brand-700 shadow-soft ring-1 ring-brand-200/60"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                  }`
                }
              >
                {t(link.key)}
              </NavLink>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-neutral-200/70 pt-3">
              {roleSwitcher}
              <LanguageSwitcher />
              <button
                type="button"
                onClick={() => logout.mutate()}
                className="rounded-lg px-3 py-2.5 text-start text-sm font-medium text-neutral-600 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900"
              >
                {t("common.logout")}
              </button>
            </div>
          </nav>
        )}
      </header>
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
}

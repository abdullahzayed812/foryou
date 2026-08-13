import { create } from "zustand";
import type { Role } from "@foryou/shared";

/**
 * BRD Rule 1 "Multiple Roles": one account can hold several roles (e.g.
 * Customer + Seller). Not persisted across reloads — it's re-derived from
 * `me.roles` each session (see AppLayout), same "cheap to recompute, no
 * need to persist" philosophy as the rest of the auth store.
 */
interface ActiveRoleState {
  activeRole: Role | null;
  setActiveRole: (role: Role) => void;
  /** Must be called on every identity change (login/logout/register) — otherwise
   * the previous account's role survives in this module-scoped store and both
   * the navbar and DashboardPage's home view keep rendering it for the newly
   * signed-in account until a hard reload re-initializes the store. */
  resetActiveRole: () => void;
}

export const useActiveRoleStore = create<ActiveRoleState>((set) => ({
  activeRole: null,
  setActiveRole: (role) => set({ activeRole: role }),
  resetActiveRole: () => set({ activeRole: null }),
}));

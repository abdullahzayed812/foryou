import { Navigate, Outlet } from "react-router-dom";
import type { Role } from "@foryou/shared";
import { useMe } from "@/features/auth/hooks";
import { PageSpinner } from "@/components/ui/Spinner";

/**
 * Guards a role's route group (e.g. /admin/*, /sellers/me/*) so a page
 * component only mounts for an account that actually holds one of `roles`.
 * Without this, ProtectedRoute's auth-only check let any logged-in user
 * navigate straight to another role's URL — the page would render and only
 * its data fetches would 403, instead of the route itself being off-limits.
 */
export function RoleRoute({ roles }: { roles: Role[] }) {
  const { data: me, isLoading } = useMe();

  if (isLoading || !me) return <PageSpinner />;
  if (!roles.some((role) => me.roles.includes(role))) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

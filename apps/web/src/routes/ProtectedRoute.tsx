import { Navigate, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/features/auth/store";

export function ProtectedRoute() {
  const { t } = useTranslation();
  const status = useAuthStore((s) => s.status);

  if (status === "idle") {
    return (
      <div className="flex min-h-full items-center justify-center py-24 text-neutral-500">
        {t("common.loading")}
      </div>
    );
  }

  if (status === "anonymous") return <Navigate to="/login" replace />;

  return <Outlet />;
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Role } from "@foryou/shared";
import { useAdminUsers, useAdminUserStats } from "@/features/admin/hooks";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { PageSpinner } from "@/components/ui/Spinner";

const STATUS_TONE = { active: "success", suspended: "warning", banned: "danger" } as const;

export function AdminUsersListPage() {
  const { t } = useTranslation();
  const [role, setRole] = useState<Role | "">("");
  const [status, setStatus] = useState<"" | "active" | "suspended" | "banned">("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useAdminUsers({
    role: role || undefined,
    status: status || undefined,
    search: search || undefined,
  });
  const { data: stats } = useAdminUserStats();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">{t("admin.users.title")}</h1>

      {stats && (
        <div className="flex flex-wrap gap-2">
          {stats.byRole.map((r) => (
            <Badge key={r.role}>
              {t(`roles.${r.role}`)}: {r.count}
            </Badge>
          ))}
          {stats.byStatus.map((s) => (
            <Badge key={s.status} tone={STATUS_TONE[s.status]}>
              {t(`accountStatus.${s.status}`)}: {s.count}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <Select
            label={t("admin.users.filterRole")}
            value={role}
            onChange={(e) => setRole(e.target.value as Role | "")}
          >
            <option value="">{t("admin.users.allRoles")}</option>
            <option value="customer">{t("roles.customer")}</option>
            <option value="seller">{t("roles.seller")}</option>
            <option value="merchant">{t("roles.merchant")}</option>
            <option value="admin">{t("roles.admin")}</option>
          </Select>
        </div>
        <div className="w-44">
          <Select
            label={t("admin.users.filterStatus")}
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="">{t("admin.users.allStatuses")}</option>
            <option value="active">{t("accountStatus.active")}</option>
            <option value="suspended">{t("accountStatus.suspended")}</option>
            <option value="banned">{t("accountStatus.banned")}</option>
          </Select>
        </div>
        <div className="min-w-[220px] flex-1">
          <TextField
            label={t("admin.users.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="flex flex-col gap-2">
          {data?.map((user) => (
            <Link key={user.id} to={`/admin/users/${user.id}`}>
              <Card className="flex items-center justify-between p-4 transition-shadow hover:shadow-md">
                <div>
                  <p className="font-medium text-neutral-900">{user.email}</p>
                  <p className="text-xs text-neutral-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[user.status]}>{t(`accountStatus.${user.status}`)}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

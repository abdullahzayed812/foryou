import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMyImportRequests } from "@/features/import-requests/hooks";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { InboxIcon } from "@/components/ui/icons";

const STATUS_TONE = {
  open: "brand",
  offer_selected: "success",
  closed: "neutral",
  expired: "danger",
} as const;

export function ImportRequestsListPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useMyImportRequests();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("importRequests.list.title")}
        actions={
          <Link to="/import-requests/new">
            <Button fullWidth={false}>{t("importRequests.list.create")}</Button>
          </Link>
        }
      />

      {isLoading && <ListSkeleton rows={4} />}

      {!isLoading && data && data.length === 0 && (
        <EmptyState
          icon={<InboxIcon />}
          title={t("importRequests.list.empty")}
          hint={t("importRequests.list.emptyHint")}
          action={
            <Link to="/import-requests/new">
              <Button fullWidth={false}>{t("importRequests.list.create")}</Button>
            </Link>
          }
        />
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.map((request) => (
            <Link key={request.id} to={`/import-requests/${request.id}`}>
              <Card className="flex items-center justify-between gap-4 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lifted">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900">
                    {request.links.length} {t("importRequests.list.linksCount")}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {new Date(request.createdAt).toLocaleDateString()}
                    {request.sourceCountry
                      ? ` · ${t(`countries.${request.sourceCountry}`)}`
                      : ""}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[request.status]}>
                  {t(`importRequestStatus.${request.status}`)}
                </Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

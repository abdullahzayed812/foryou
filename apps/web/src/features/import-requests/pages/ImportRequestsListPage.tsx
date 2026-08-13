import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMyImportRequests } from "@/features/import-requests/hooks";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

const STATUS_TONE = {
  open: "brand",
  offer_selected: "success",
  closed: "neutral",
  expired: "danger",
} as const;

export function ImportRequestsListPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useMyImportRequests();

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">{t("importRequests.list.title")}</h1>
        <Link to="/import-requests/new">
          <Button fullWidth={false}>{t("importRequests.list.create")}</Button>
        </Link>
      </div>

      {data && data.length === 0 && (
        <EmptyState
          title={t("importRequests.list.empty")}
          hint={t("importRequests.list.emptyHint")}
        />
      )}

      <div className="flex flex-col gap-3">
        {data?.map((request) => (
          <Link key={request.id} to={`/import-requests/${request.id}`}>
            <Card className="flex items-center justify-between p-4 transition-shadow hover:shadow-md">
              <div>
                <p className="font-medium text-neutral-900">
                  {request.links.length} {t("importRequests.list.linksCount")}
                </p>
                <p className="text-sm text-neutral-500">
                  {new Date(request.createdAt).toLocaleDateString()}
                  {request.sourceCountry ? ` · ${t(`countries.${request.sourceCountry}`)}` : ""}
                </p>
              </div>
              <Badge tone={STATUS_TONE[request.status]}>
                {t(`importRequestStatus.${request.status}`)}
              </Badge>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

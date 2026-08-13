import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSellerOpenRequests, useIgnoreImportRequest } from "@/features/import-requests/hooks";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { CounterpartyModal } from "@/components/ui/CounterpartyModal";
import type { ImportRequest } from "@/features/import-requests/types";

export function SellerQueuePage() {
  const { t } = useTranslation();
  const { data, isLoading } = useSellerOpenRequests();
  const ignore = useIgnoreImportRequest();
  const [customerRequest, setCustomerRequest] = useState<ImportRequest | null>(null);

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">{t("sellerQueue.title")}</h1>

      {data && data.length === 0 && (
        <EmptyState title={t("sellerQueue.empty")} hint={t("sellerQueue.emptyHint")} />
      )}

      <div className="flex flex-col gap-3">
        {data?.map((request) => (
          <Card key={request.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-neutral-900">
                {request.links.length} {t("importRequests.list.linksCount")}
              </p>
              <p className="text-sm text-neutral-500">
                {new Date(request.createdAt).toLocaleDateString()}
                {request.sourceCountry ? ` · ${t(`countries.${request.sourceCountry}`)}` : ""}
              </p>
              {request.notes?.preferences && (
                <p className="mt-1 text-sm text-neutral-600">{request.notes.preferences}</p>
              )}
              {request.customerName && (
                <p className="mt-1 text-sm text-neutral-600">
                  {t("sellerQueue.customer")}:{" "}
                  <button
                    type="button"
                    onClick={() => setCustomerRequest(request)}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {request.customerName}
                  </button>
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="secondary"
                fullWidth={false}
                loading={ignore.isPending}
                onClick={() => ignore.mutate(request.id)}
              >
                {t("sellerQueue.ignore")}
              </Button>
              <Link to={`/sellers/me/import-requests/${request.id}`}>
                <Button fullWidth={false}>{t("sellerQueue.submitOffer")}</Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>

      {customerRequest?.customerName && (
        <CounterpartyModal
          name={customerRequest.customerName}
          role="customer"
          memberSince={customerRequest.customerMemberSince ?? customerRequest.createdAt}
          onClose={() => setCustomerRequest(null)}
        />
      )}
    </div>
  );
}

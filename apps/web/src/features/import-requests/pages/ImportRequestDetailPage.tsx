import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  useImportRequest,
  useOffersForRequest,
  useCancelImportRequest,
  useSelectOffer,
} from "@/features/import-requests/hooks";
import { useMyOrders } from "@/features/orders/hooks";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorAlert } from "@/components/ui/Alert";
import { CounterpartyModal } from "@/components/ui/CounterpartyModal";
import { LinkSourcePreview } from "@/components/ui/LinkSourcePreview";
import type { Offer } from "@/features/import-requests/types";

export function ImportRequestDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: request, isLoading } = useImportRequest(id);
  const { data: offers } = useOffersForRequest(id);
  const { data: orders } = useMyOrders();
  const cancel = useCancelImportRequest();
  const selectOffer = useSelectOffer();
  const [sellerOffer, setSellerOffer] = useState<Offer | null>(null);

  if (isLoading || !request) return <PageSpinner />;

  const relatedOrder = orders?.find((o) => o.importRequestId === request.id);
  const sortedOffers = [...(offers ?? [])].sort(
    (a, b) => Number(a.totalPrice) - Number(b.totalPrice),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">{t("importRequests.detail.title")}</h1>
        <Badge>{t(`importRequestStatus.${request.status}`)}</Badge>
      </div>

      <Card className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-700">
            {t("importRequests.detail.links")}
          </h2>
          <ul className="mt-1 flex flex-col gap-2">
            {request.links.map((link) => (
              <li key={link.id}>
                <a href={link.url} target="_blank" rel="noreferrer" className="block">
                  <LinkSourcePreview url={link.url} />
                </a>
              </li>
            ))}
          </ul>
        </div>
        {request.notes?.preferences && (
          <div>
            <h2 className="text-sm font-semibold text-neutral-700">
              {t("importRequests.detail.preferences")}
            </h2>
            <p className="text-sm text-neutral-600">{request.notes.preferences}</p>
          </div>
        )}
        {request.sourceCountry && (
          <div>
            <h2 className="text-sm font-semibold text-neutral-700">
              {t("importRequests.detail.sourceCountry")}
            </h2>
            <p className="text-sm text-neutral-600">{t(`countries.${request.sourceCountry}`)}</p>
          </div>
        )}

        {request.status === "open" && (
          <div className="pt-2">
            <Button
              variant="secondary"
              fullWidth={false}
              loading={cancel.isPending}
              onClick={() => cancel.mutate(request.id)}
            >
              {t("importRequests.detail.cancel")}
            </Button>
          </div>
        )}
      </Card>

      {relatedOrder && (
        <Card className="border-brand-200 bg-brand-50">
          <p className="text-sm text-brand-800">{t("importRequests.detail.orderCreated")}</p>
          <Link to={`/orders/${relatedOrder.id}`}>
            <Button variant="ghost" className="mt-2" fullWidth={false}>
              {t("importRequests.detail.viewOrder")}
            </Button>
          </Link>
        </Card>
      )}

      {request.status === "open" && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">
            {t("importRequests.detail.offers")}
          </h2>
          <ErrorAlert error={selectOffer.error} />

          {sortedOffers.length === 0 && (
            <EmptyState
              title={t("importRequests.detail.noOffers")}
              hint={t("importRequests.detail.noOffersHint")}
            />
          )}

          {sortedOffers.map((offer) => (
            <Card key={offer.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-lg font-bold text-neutral-900">
                  {Number(offer.totalPrice).toFixed(2)} {t("common.egp")}
                </p>
                <p className="text-sm text-neutral-600">
                  {t("importRequests.detail.deliveryIn", { days: offer.estimatedDeliveryDays })} ·{" "}
                  {t("importRequests.detail.depositOf", { percent: offer.depositPercentage })}
                </p>
                {offer.sellerName && (
                  <p className="text-sm text-neutral-600">
                    {t("importRequests.detail.seller")}:{" "}
                    <button
                      type="button"
                      onClick={() => setSellerOffer(offer)}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {offer.sellerName}
                    </button>
                  </p>
                )}
              </div>
              <Button
                fullWidth={false}
                loading={selectOffer.isPending}
                onClick={() =>
                  selectOffer.mutate(offer.id, {
                    onSuccess: (order) => void navigate(`/orders/${order.id}`),
                  })
                }
              >
                {t("importRequests.detail.selectOffer")}
              </Button>
            </Card>
          ))}
        </div>
      )}

      {sellerOffer?.sellerName && (
        <CounterpartyModal
          name={sellerOffer.sellerName}
          role="seller"
          memberSince={sellerOffer.sellerMemberSince ?? sellerOffer.createdAt}
          onClose={() => setSellerOffer(null)}
        />
      )}
    </div>
  );
}

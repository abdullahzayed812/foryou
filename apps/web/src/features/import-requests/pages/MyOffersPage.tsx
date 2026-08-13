import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DEPOSIT_PERCENTAGES, type DepositPercentage } from "@foryou/shared";
import { useMyOffers, useEditOffer, useCancelOffer } from "@/features/import-requests/hooks";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Select } from "@/components/ui/Select";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { CounterpartyModal } from "@/components/ui/CounterpartyModal";
import type { Offer } from "@/features/import-requests/types";

const STATUS_TONE = {
  active: "brand",
  selected: "success",
  rejected: "neutral",
  cancelled: "danger",
} as const;

function EditableOffer({ offer }: { offer: Offer }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [showCustomer, setShowCustomer] = useState(false);
  const [totalPrice, setTotalPrice] = useState(offer.totalPrice);
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState(
    String(offer.estimatedDeliveryDays),
  );
  const [depositPercentage, setDepositPercentage] = useState<DepositPercentage>(
    offer.depositPercentage,
  );
  const edit = useEditOffer();
  const cancel = useCancelOffer();

  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold text-neutral-900">
          {Number(offer.totalPrice).toFixed(2)} {t("common.egp")}
        </p>
        <Badge tone={STATUS_TONE[offer.status]}>{t(`offerStatus.${offer.status}`)}</Badge>
      </div>
      <p className="text-sm text-neutral-600">
        {t("importRequests.detail.deliveryIn", { days: offer.estimatedDeliveryDays })} ·{" "}
        {t("importRequests.detail.depositOf", { percent: offer.depositPercentage })}
      </p>
      {offer.customerName && (
        <p className="text-sm text-neutral-600">
          {t("sellerQueue.customer")}:{" "}
          <button
            type="button"
            onClick={() => setShowCustomer(true)}
            className="font-medium text-brand-700 hover:underline"
          >
            {offer.customerName}
          </button>
        </p>
      )}
      {showCustomer && offer.customerName && (
        <CounterpartyModal
          name={offer.customerName}
          role="customer"
          memberSince={offer.customerMemberSince ?? offer.createdAt}
          onClose={() => setShowCustomer(false)}
        />
      )}

      {offer.status === "active" && (
        <>
          {editing ? (
            <div className="mt-2 flex flex-col gap-3">
              <TextField
                label={t("sellerQueue.form.totalPrice")}
                type="number"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
              />
              <TextField
                label={t("sellerQueue.form.estimatedDeliveryDays")}
                type="number"
                value={estimatedDeliveryDays}
                onChange={(e) => setEstimatedDeliveryDays(e.target.value)}
              />
              <Select
                label={t("sellerQueue.form.depositPercentage")}
                value={depositPercentage}
                onChange={(e) => setDepositPercentage(Number(e.target.value) as DepositPercentage)}
              >
                {DEPOSIT_PERCENTAGES.map((p) => (
                  <option key={p} value={p}>
                    {p}%
                  </option>
                ))}
              </Select>
              <div className="flex gap-2">
                <Button
                  fullWidth={false}
                  loading={edit.isPending}
                  onClick={() =>
                    edit.mutate(
                      {
                        id: offer.id,
                        totalPrice: Number(totalPrice),
                        estimatedDeliveryDays: Number(estimatedDeliveryDays),
                        depositPercentage,
                      },
                      { onSuccess: () => setEditing(false) },
                    )
                  }
                >
                  {t("common.save")}
                </Button>
                <Button variant="secondary" fullWidth={false} onClick={() => setEditing(false)}>
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex gap-2">
              <Button variant="secondary" fullWidth={false} onClick={() => setEditing(true)}>
                {t("sellerQueue.editOffer")}
              </Button>
              <Button
                variant="ghost"
                fullWidth={false}
                loading={cancel.isPending}
                onClick={() => cancel.mutate(offer.id)}
              >
                {t("sellerQueue.cancelOffer")}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export function MyOffersPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useMyOffers();

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">{t("sellerQueue.myOffers")}</h1>

      {data && data.length === 0 && <EmptyState title={t("sellerQueue.noOffersYet")} />}

      <div className="flex flex-col gap-3">
        {data?.map((offer) => (
          <EditableOffer key={offer.id} offer={offer} />
        ))}
      </div>
    </div>
  );
}

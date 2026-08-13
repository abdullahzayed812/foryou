import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DEPOSIT_PERCENTAGES, type DepositPercentage } from "@foryou/shared";
import { useSellerImportRequest, useSubmitOffer } from "@/features/import-requests/hooks";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/Alert";
import { PageSpinner } from "@/components/ui/Spinner";
import { CounterpartyModal } from "@/components/ui/CounterpartyModal";
import { LinkSourcePreview } from "@/components/ui/LinkSourcePreview";

export function SellerImportRequestDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: request, isLoading } = useSellerImportRequest(id);
  const submitOffer = useSubmitOffer();

  const [totalPrice, setTotalPrice] = useState("");
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState("7");
  const [depositPercentage, setDepositPercentage] = useState<DepositPercentage>(20);
  const [showCustomer, setShowCustomer] = useState(false);

  if (isLoading || !request) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">{t("importRequests.detail.title")}</h1>

      {request.customerName && (
        <p className="text-sm text-neutral-600">
          {t("sellerQueue.customer")}:{" "}
          <button
            type="button"
            onClick={() => setShowCustomer(true)}
            className="font-medium text-brand-700 hover:underline"
          >
            {request.customerName}
          </button>
        </p>
      )}

      <Card className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-neutral-700">
          {t("importRequests.detail.links")}
        </h2>
        <ul className="flex flex-col gap-2">
          {request.links.map((link) => (
            <li key={link.id}>
              <a href={link.url} target="_blank" rel="noreferrer" className="block">
                <LinkSourcePreview url={link.url} />
              </a>
            </li>
          ))}
        </ul>
        {request.notes?.preferences && (
          <p className="mt-2 text-sm text-neutral-600">{request.notes.preferences}</p>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-neutral-700">{t("sellerQueue.form.title")}</h2>
        <ErrorAlert error={submitOffer.error} />
        <TextField
          label={t("sellerQueue.form.totalPrice")}
          type="number"
          min={0.01}
          step="0.01"
          value={totalPrice}
          onChange={(e) => setTotalPrice(e.target.value)}
          required
        />
        <TextField
          label={t("sellerQueue.form.estimatedDeliveryDays")}
          type="number"
          min={1}
          value={estimatedDeliveryDays}
          onChange={(e) => setEstimatedDeliveryDays(e.target.value)}
          required
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
        <Button
          loading={submitOffer.isPending}
          disabled={!totalPrice || !estimatedDeliveryDays}
          onClick={() =>
            submitOffer.mutate(
              {
                requestId: request.id,
                totalPrice: Number(totalPrice),
                estimatedDeliveryDays: Number(estimatedDeliveryDays),
                depositPercentage,
              },
              { onSuccess: () => void navigate("/sellers/me/offers") },
            )
          }
        >
          {t("sellerQueue.form.submit")}
        </Button>
      </Card>

      {showCustomer && request.customerName && (
        <CounterpartyModal
          name={request.customerName}
          role="customer"
          memberSince={request.customerMemberSince ?? request.createdAt}
          onClose={() => setShowCustomer(false)}
        />
      )}
    </div>
  );
}

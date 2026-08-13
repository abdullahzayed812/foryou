import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFulfillerOrders } from "@/features/orders/hooks";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { CounterpartyModal } from "@/components/ui/CounterpartyModal";
import type { Order } from "@/features/orders/types";

const STATUS_TONE = {
  awaiting_deposit: "warning",
  deposit_paid: "brand",
  processing: "brand",
  delivered: "warning",
  completed: "success",
  cancelled: "danger",
} as const;

export function FulfillerOrdersListPage({
  basePath,
  detailBase,
}: {
  basePath: "/sellers/me/orders" | "/merchants/me/orders";
  detailBase: string;
}) {
  const { t } = useTranslation();
  const { data, isLoading } = useFulfillerOrders(basePath);
  const [customerOrder, setCustomerOrder] = useState<Order | null>(null);

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">{t("orders.list.title")}</h1>

      {data && data.length === 0 && (
        <EmptyState title={t("orders.list.empty")} hint={t("orders.list.emptyHint")} />
      )}

      <div className="flex flex-col gap-3">
        {data?.map((order) => (
          <Link key={order.id} to={`${detailBase}/${order.id}`}>
            <Card className="flex items-center justify-between p-4 transition-shadow hover:shadow-md">
              <div>
                <p className="font-medium text-neutral-900">
                  {t(`orderType.${order.type}`)} · {Number(order.totalAmount).toFixed(2)}{" "}
                  {t("common.egp")}
                </p>
                <p className="text-sm text-neutral-500">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
                {order.customerName && (
                  <p className="text-sm text-neutral-600">
                    {t("orders.list.customer")}:{" "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCustomerOrder(order);
                      }}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {order.customerName}
                    </button>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {order.openDisputeId && (
                  <Badge tone="danger">{t("orders.detail.disputeOpen")}</Badge>
                )}
                <Badge tone={STATUS_TONE[order.stage]}>{t(`orderStage.${order.stage}`)}</Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {customerOrder?.customerName && (
        <CounterpartyModal
          name={customerOrder.customerName}
          role="customer"
          memberSince={customerOrder.customerMemberSince ?? customerOrder.createdAt}
          onClose={() => setCustomerOrder(null)}
        />
      )}
    </div>
  );
}

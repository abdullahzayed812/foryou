import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMyOrders } from "@/features/orders/hooks";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrdersIcon } from "@/components/ui/icons";

const STATUS_TONE = {
  awaiting_deposit: "warning",
  deposit_paid: "brand",
  processing: "brand",
  delivered: "warning",
  completed: "success",
  cancelled: "danger",
} as const;

export function OrdersListPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useMyOrders();

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">{t("orders.list.title")}</h1>

      {data && data.length === 0 && (
        <EmptyState title={t("orders.list.empty")} hint={t("orders.list.emptyHint")} />
      )}

      <div className="flex flex-col gap-3">
        {data?.map((order) => (
          <Link key={order.id} to={`/orders/${order.id}`}>
            <Card className="flex items-center gap-4 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <span className="h-5 w-5">
                  <OrdersIcon />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-neutral-900">
                  {t(`orderType.${order.type}`)} · {Number(order.totalAmount).toFixed(2)}{" "}
                  {t("common.egp")}
                </p>
                <p className="text-sm text-neutral-500">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {order.openDisputeId && (
                  <Badge tone="danger">{t("orders.detail.disputeOpen")}</Badge>
                )}
                <Badge tone={STATUS_TONE[order.stage]}>{t(`orderStage.${order.stage}`)}</Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

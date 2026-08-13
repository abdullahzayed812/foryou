import { useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  useFulfillerOrder,
  useUpdateOrderTimeline,
  useFulfillerCancelOrder,
} from "@/features/orders/hooks";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { ErrorAlert } from "@/components/ui/Alert";
import { PageSpinner } from "@/components/ui/Spinner";
import { CounterpartyModal } from "@/components/ui/CounterpartyModal";
import type { OrderTimelineStep } from "@/features/orders/types";

const STATUS_TONE = {
  awaiting_deposit: "warning",
  deposit_paid: "brand",
  processing: "brand",
  delivered: "warning",
  completed: "success",
  cancelled: "danger",
} as const;

const TIMELINE_STEPS: OrderTimelineStep[] = [
  "waiting_to_place_order",
  "order_placed",
  "shipment_in_progress",
  "shipment_arrived_in_egypt",
  "out_for_delivery",
  "delivered",
];

export function FulfillerOrderDetailPage({
  basePath,
  canCancel,
}: {
  basePath: "/sellers/me/orders" | "/merchants/me/orders";
  canCancel: boolean;
}) {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useFulfillerOrder(basePath, id);
  const updateTimeline = useUpdateOrderTimeline(basePath);
  const cancelOrder = useFulfillerCancelOrder(basePath);

  const [step, setStep] = useState<OrderTimelineStep>("shipment_in_progress");
  const [note, setNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [showCustomer, setShowCustomer] = useState(false);

  if (isLoading || !order) return <PageSpinner />;

  const completedSteps = new Set(order.timeline.map((e) => e.step));
  const canUpdateTimeline = order.stage === "deposit_paid" || order.stage === "processing";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">
          {t(`orderType.${order.type}`)} — {Number(order.totalAmount).toFixed(2)} {t("common.egp")}
        </h1>
        <div className="flex items-center gap-2">
          {order.openDisputeId && <Badge tone="danger">{t("orders.detail.disputeOpen")}</Badge>}
          <Badge tone={STATUS_TONE[order.stage]}>{t(`orderStage.${order.stage}`)}</Badge>
        </div>
      </div>

      {order.customerName && (
        <p className="text-sm text-neutral-600">
          {t("orders.list.customer")}:{" "}
          <button
            type="button"
            onClick={() => setShowCustomer(true)}
            className="font-medium text-brand-700 hover:underline"
          >
            {order.customerName}
          </button>
        </p>
      )}

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">
          {t("orders.detail.timeline")}
        </h2>
        <ol className="flex flex-col gap-2">
          {TIMELINE_STEPS.map((s) => {
            const done = completedSteps.has(s);
            return (
              <li key={s} className="flex items-center gap-2 text-sm">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${done ? "bg-brand-600" : "bg-neutral-200"}`}
                />
                <span className={done ? "text-neutral-900" : "text-neutral-400"}>
                  {t(`orderTimelineStep.${s}`)}
                </span>
              </li>
            );
          })}
        </ol>
      </Card>

      {canUpdateTimeline && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-neutral-700">
            {t("fulfillerOrders.updateTimeline")}
          </h2>
          <ErrorAlert error={updateTimeline.error} />
          <Select
            label={t("fulfillerOrders.step")}
            value={step}
            onChange={(e) => setStep(e.target.value as OrderTimelineStep)}
          >
            {TIMELINE_STEPS.map((s) => (
              <option key={s} value={s}>
                {t(`orderTimelineStep.${s}`)}
              </option>
            ))}
          </Select>
          <TextField
            label={t("fulfillerOrders.note")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            fullWidth={false}
            loading={updateTimeline.isPending}
            onClick={() => updateTimeline.mutate({ id: order.id, step, note: note || undefined })}
          >
            {t("common.save")}
          </Button>
        </Card>
      )}

      {canCancel && (order.stage === "deposit_paid" || order.stage === "processing") && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-neutral-700">
            {t("fulfillerOrders.cancelOrder")}
          </h2>
          <ErrorAlert error={cancelOrder.error} />
          <TextField
            label={t("fulfillerOrders.cancelReason")}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <Button
            variant="secondary"
            fullWidth={false}
            loading={cancelOrder.isPending}
            disabled={!cancelReason}
            onClick={() => cancelOrder.mutate({ id: order.id, reason: cancelReason })}
          >
            {t("fulfillerOrders.cancelOrder")}
          </Button>
        </Card>
      )}

      {order.stage === "cancelled" && order.cancellationReason && (
        <Card className="border-red-200 bg-red-50 text-sm text-red-700">
          {order.cancellationReason}
        </Card>
      )}

      {showCustomer && order.customerName && (
        <CounterpartyModal
          name={order.customerName}
          role="customer"
          memberSince={order.customerMemberSince ?? order.createdAt}
          onClose={() => setShowCustomer(false)}
        />
      )}
    </div>
  );
}

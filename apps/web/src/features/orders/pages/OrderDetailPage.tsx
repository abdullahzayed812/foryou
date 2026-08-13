import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  useOrder,
  useConfirmReceipt,
  useCancelOrder,
  usePayDeposit,
  useSimulatePayment,
} from "@/features/orders/hooks";
import { useMyReviews, useCreateReview, useUpdateReview } from "@/features/reviews/hooks";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { StarRatingInput } from "@/components/ui/StarRating";
import { PageSpinner } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/Alert";
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

function PaymentSection({ orderId, amount }: { orderId: string; amount: number }) {
  const { t } = useTranslation();
  const payDeposit = usePayDeposit();
  const simulate = useSimulatePayment();
  const [checkout, setCheckout] = useState<{
    checkoutUrl: string;
    providerTransactionId: string;
  } | null>(null);

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-neutral-700">{t("orders.detail.payment")}</h2>
      <ErrorAlert error={payDeposit.error ?? simulate.error} />
      {!checkout ? (
        <Button
          fullWidth={false}
          loading={payDeposit.isPending}
          onClick={() => payDeposit.mutate(orderId, { onSuccess: setCheckout })}
        >
          {t("orders.detail.payDeposit")}
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <a
            href={checkout.checkoutUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            {t("orders.detail.openCheckout")}
          </a>
          <p className="text-xs text-neutral-500">{t("orders.detail.devModeHint")}</p>
          <Button
            variant="secondary"
            fullWidth={false}
            loading={simulate.isPending}
            onClick={() =>
              simulate.mutate({ transactionId: checkout.providerTransactionId, orderId, amount })
            }
          >
            {t("orders.detail.simulatePayment")}
          </Button>
        </div>
      )}
    </Card>
  );
}

function ReviewSection({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const { data: reviews } = useMyReviews();
  const createReview = useCreateReview();
  const updateReview = useUpdateReview();
  const existing = reviews?.find((r) => r.orderId === orderId);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);

  if (existing && !editing) {
    return (
      <Card className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-neutral-700">{t("orders.detail.yourReview")}</h2>
        <StarRatingInput value={existing.rating} onChange={() => {}} name="review-readonly" />
        {existing.comment && <p className="text-sm text-neutral-600">{existing.comment}</p>}
        {existing.reply && (
          <div className="mt-2 rounded-md bg-neutral-50 p-3 text-sm">
            <p className="font-medium text-neutral-700">{t("orders.detail.sellerReply")}</p>
            <p className="text-neutral-600">{existing.reply.reply}</p>
          </div>
        )}
        {/* The edit window is backend-enforced (7 days from submission) — the
            button always shows; a stale attempt just surfaces the ErrorAlert
            below rather than relying on the client's clock to gate it. */}
        <Button
          variant="ghost"
          fullWidth={false}
          onClick={() => {
            setRating(existing.rating);
            setComment(existing.comment ?? "");
            setEditing(true);
          }}
        >
          {t("orders.detail.editReview")}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-neutral-700">{t("orders.detail.leaveReview")}</h2>
      <ErrorAlert error={createReview.error ?? updateReview.error} />
      <StarRatingInput value={rating} onChange={setRating} name="review-rating" />
      <TextArea
        label={t("orders.detail.reviewComment")}
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button
        fullWidth={false}
        loading={createReview.isPending || updateReview.isPending}
        onClick={() => {
          if (existing) {
            updateReview.mutate(
              { id: existing.id, rating, comment },
              { onSuccess: () => setEditing(false) },
            );
          } else {
            createReview.mutate({ orderId, rating, comment });
          }
        }}
      >
        {t("orders.detail.submitReview")}
      </Button>
    </Card>
  );
}

export function OrderDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useOrder(id);
  const confirmReceipt = useConfirmReceipt();
  const cancelOrder = useCancelOrder();

  if (isLoading || !order) return <PageSpinner />;

  const payableAmount =
    order.type === "import" ? Number(order.depositAmount ?? 0) : Number(order.totalAmount);
  const completedSteps = new Set(order.timeline.map((e) => e.step));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">
          {t(`orderType.${order.type}`)} — {Number(order.totalAmount).toFixed(2)} {t("common.egp")}
        </h1>
        <div className="flex items-center gap-2">
          {order.openDisputeId && (
            <Link to={`/disputes/${order.openDisputeId}`}>
              <Badge tone="danger">{t("orders.detail.disputeOpen")}</Badge>
            </Link>
          )}
          <Badge tone={STATUS_TONE[order.stage]}>{t(`orderStage.${order.stage}`)}</Badge>
        </div>
      </div>

      {order.stage === "awaiting_deposit" && (
        <>
          <PaymentSection orderId={order.id} amount={payableAmount} />
          <div>
            <Button
              variant="secondary"
              fullWidth={false}
              loading={cancelOrder.isPending}
              onClick={() => cancelOrder.mutate(order.id)}
            >
              {t("orders.detail.cancel")}
            </Button>
          </div>
        </>
      )}

      {(order.stage === "deposit_paid" ||
        order.stage === "processing" ||
        order.stage === "delivered" ||
        order.stage === "completed") && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">
            {t("orders.detail.timeline")}
          </h2>
          <ol className="flex flex-col gap-2">
            {TIMELINE_STEPS.map((step) => {
              const done = completedSteps.has(step);
              return (
                <li key={step} className="flex items-center gap-2 text-sm">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${done ? "bg-brand-600" : "bg-neutral-200"}`}
                  />
                  <span className={done ? "text-neutral-900" : "text-neutral-400"}>
                    {t(`orderTimelineStep.${step}`)}
                  </span>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      {order.stage === "delivered" && (
        <Card className="flex flex-col gap-3">
          <ErrorAlert error={confirmReceipt.error} />
          <div className="flex gap-3">
            <Button
              fullWidth={false}
              loading={confirmReceipt.isPending}
              onClick={() => confirmReceipt.mutate(order.id)}
            >
              {t("orders.detail.confirmReceipt")}
            </Button>
            {!order.openDisputeId && (
              <Link to={`/orders/${order.id}/dispute`}>
                <Button variant="secondary" fullWidth={false}>
                  {t("orders.detail.openDispute")}
                </Button>
              </Link>
            )}
          </div>
        </Card>
      )}

      {order.stage === "completed" && !order.openDisputeId && (
        <Link
          to={`/orders/${order.id}/dispute`}
          className="text-sm text-neutral-500 hover:underline"
        >
          {t("orders.detail.openDispute")}
        </Link>
      )}

      {order.stage === "cancelled" && order.cancellationReason && (
        <Card className="border-red-200 bg-red-50 text-sm text-red-700">
          {order.cancellationReason}
        </Card>
      )}

      {order.stage === "completed" && <ReviewSection orderId={order.id} />}
    </div>
  );
}

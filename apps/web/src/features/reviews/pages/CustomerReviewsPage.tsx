import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  useMyReviews,
  usePendingReviews,
  useCreateReview,
  useUpdateReview,
} from "@/features/reviews/hooks";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { StarRatingInput } from "@/components/ui/StarRating";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorAlert } from "@/components/ui/Alert";
import type { Review, PendingReviewReminder } from "@/features/reviews/types";

function PendingReviewCard({ pending }: { pending: PendingReviewReminder }) {
  const { t } = useTranslation();
  const createReview = useCreateReview();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {t("customerReviews.completedOn", {
            date: new Date(pending.completedAt).toLocaleDateString(),
          })}
        </p>
        <Link
          to={`/orders/${pending.orderId}`}
          className="text-xs font-medium text-brand-700 hover:underline"
        >
          {t("customerReviews.viewOrder")}
        </Link>
      </div>
      <ErrorAlert error={createReview.error} />
      <StarRatingInput value={rating} onChange={setRating} name={`review-${pending.orderId}`} />
      <TextArea
        label={t("orders.detail.reviewComment")}
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button
        fullWidth={false}
        loading={createReview.isPending}
        onClick={() => createReview.mutate({ orderId: pending.orderId, rating, comment })}
      >
        {t("orders.detail.submitReview")}
      </Button>
    </Card>
  );
}

function SubmittedReviewCard({ review }: { review: Review }) {
  const { t } = useTranslation();
  const updateReview = useUpdateReview();
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(review.rating);
  const [comment, setComment] = useState(review.comment ?? "");

  if (editing) {
    return (
      <Card className="flex flex-col gap-3">
        <ErrorAlert error={updateReview.error} />
        <StarRatingInput value={rating} onChange={setRating} name={`edit-review-${review.id}`} />
        <TextArea
          label={t("orders.detail.reviewComment")}
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className="flex gap-2">
          <Button
            fullWidth={false}
            loading={updateReview.isPending}
            onClick={() =>
              updateReview.mutate(
                { id: review.id, rating, comment },
                { onSuccess: () => setEditing(false) },
              )
            }
          >
            {t("common.submit")}
          </Button>
          <Button variant="secondary" fullWidth={false} onClick={() => setEditing(false)}>
            {t("common.cancel")}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <StarRatingInput
          value={review.rating}
          onChange={() => {}}
          name={`review-readonly-${review.id}`}
        />
        <Link
          to={`/orders/${review.orderId}`}
          className="text-xs text-neutral-400 hover:underline"
        >
          {new Date(review.createdAt).toLocaleDateString()}
        </Link>
      </div>
      {review.comment && <p className="text-sm text-neutral-600">{review.comment}</p>}
      {review.reply && (
        <div className="mt-2 rounded-md bg-neutral-50 p-3 text-sm">
          <p className="font-medium text-neutral-700">{t("orders.detail.sellerReply")}</p>
          <p className="text-neutral-600">{review.reply.reply}</p>
        </div>
      )}
      {/* The edit window is backend-enforced (see OrderDetailPage's ReviewSection) —
          the button always shows; a stale attempt just surfaces the ErrorAlert above. */}
      <Button
        variant="ghost"
        className="mt-1"
        fullWidth={false}
        onClick={() => {
          setRating(review.rating);
          setComment(review.comment ?? "");
          setEditing(true);
        }}
      >
        {t("orders.detail.editReview")}
      </Button>
    </Card>
  );
}

export function CustomerReviewsPage() {
  const { t } = useTranslation();
  const { data: pending, isLoading: pendingLoading } = usePendingReviews();
  const { data: reviews, isLoading: reviewsLoading } = useMyReviews();

  if (pendingLoading || reviewsLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-neutral-900">{t("customerReviews.title")}</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-700">
          {t("customerReviews.pendingTitle")}
        </h2>
        {pending && pending.length === 0 && (
          <EmptyState title={t("customerReviews.pendingEmpty")} />
        )}
        <div className="flex flex-col gap-3">
          {pending?.map((p) => (
            <PendingReviewCard key={p.orderId} pending={p} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-700">
          {t("customerReviews.submittedTitle")}
        </h2>
        {reviews && reviews.length === 0 && (
          <EmptyState title={t("customerReviews.submittedEmpty")} />
        )}
        <div className="flex flex-col gap-3">
          {reviews?.map((r) => (
            <SubmittedReviewCard key={r.id} review={r} />
          ))}
        </div>
      </section>
    </div>
  );
}

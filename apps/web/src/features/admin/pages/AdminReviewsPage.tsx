import { useTranslation } from "react-i18next";
import {
  useAdminReviews,
  useHideReview,
  useUnhideReview,
  useDeleteReviewReply,
  useDeleteReview,
} from "@/features/admin/hooks";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorAlert } from "@/components/ui/Alert";
import { StarRatingDisplay } from "@/components/ui/StarRating";
import type { Review } from "@/features/reviews/types";

function ReviewRow({ review }: { review: Review }) {
  const { t } = useTranslation();
  const hide = useHideReview();
  const unhide = useUnhideReview();
  const deleteReply = useDeleteReviewReply();
  const deleteReview = useDeleteReview();
  const isHidden = Boolean(review.hiddenAt);

  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between gap-3">
        <StarRatingDisplay rating={review.rating} />
        <div className="flex items-center gap-2">
          {isHidden && <Badge tone="warning">{t("admin.reviews.hidden")}</Badge>}
          <span className="text-xs text-neutral-500">
            {new Date(review.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {review.comment && <p className="text-sm text-neutral-700">{review.comment}</p>}

      {review.reply && (
        <div className="mt-1 flex items-start justify-between gap-3 rounded-md bg-neutral-50 px-3 py-2">
          <p className="text-sm text-neutral-600">
            <span className="font-medium text-neutral-800">{t("fulfillerReviews.yourReply")}: </span>
            {review.reply.reply}
          </p>
          <Button
            variant="ghost"
            fullWidth={false}
            loading={deleteReply.isPending}
            onClick={() => deleteReply.mutate(review.id)}
          >
            {t("admin.reviews.removeReply")}
          </Button>
        </div>
      )}

      <ErrorAlert error={hide.error ?? unhide.error ?? deleteReview.error ?? deleteReply.error} />

      <div className="mt-1 flex flex-wrap gap-2">
        {isHidden ? (
          <Button
            variant="secondary"
            fullWidth={false}
            loading={unhide.isPending}
            onClick={() => unhide.mutate(review.id)}
          >
            {t("admin.reviews.unhide")}
          </Button>
        ) : (
          <Button
            variant="secondary"
            fullWidth={false}
            loading={hide.isPending}
            onClick={() => hide.mutate(review.id)}
          >
            {t("admin.reviews.hide")}
          </Button>
        )}
        <Button
          variant="ghost"
          fullWidth={false}
          loading={deleteReview.isPending}
          onClick={() => deleteReview.mutate(review.id)}
        >
          {t("common.remove")}
        </Button>
      </div>
    </Card>
  );
}

export function AdminReviewsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useAdminReviews();

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">{t("admin.reviews.title")}</h1>
      {data && data.length === 0 && <EmptyState title={t("admin.reviews.empty")} />}
      <div className="flex flex-col gap-3">
        {data?.map((review) => (
          <ReviewRow key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
}

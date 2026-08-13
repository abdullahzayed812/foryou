import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useFulfillerReviews, useReplyToReview } from "@/features/reviews/hooks";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { StarRatingDisplay } from "@/components/ui/StarRating";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Review } from "@/features/reviews/types";

function ReviewRow({
  review,
  basePath,
}: {
  review: Review;
  basePath: "/sellers/me/reviews" | "/merchants/me/reviews";
}) {
  const { t } = useTranslation();
  const reply = useReplyToReview(basePath);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");

  return (
    <Card className="flex flex-col gap-2 p-4">
      <StarRatingDisplay rating={review.rating} />
      {review.comment && <p className="text-sm text-neutral-600">{review.comment}</p>}
      <p className="text-xs text-neutral-400">{new Date(review.createdAt).toLocaleDateString()}</p>

      {review.reply ? (
        <div className="mt-2 rounded-md bg-neutral-50 p-3 text-sm">
          <p className="font-medium text-neutral-700">{t("fulfillerReviews.yourReply")}</p>
          <p className="text-neutral-600">{review.reply.reply}</p>
        </div>
      ) : replying ? (
        <div className="mt-2 flex flex-col gap-2">
          <TextArea
            label={t("fulfillerReviews.replyLabel")}
            rows={2}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              fullWidth={false}
              loading={reply.isPending}
              onClick={() =>
                reply.mutate(
                  { reviewId: review.id, reply: replyText },
                  { onSuccess: () => setReplying(false) },
                )
              }
            >
              {t("common.submit")}
            </Button>
            <Button variant="secondary" fullWidth={false} onClick={() => setReplying(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          className="mt-1"
          fullWidth={false}
          onClick={() => setReplying(true)}
        >
          {t("fulfillerReviews.reply")}
        </Button>
      )}
    </Card>
  );
}

export function FulfillerReviewsPage({
  basePath,
}: {
  basePath: "/sellers/me/reviews" | "/merchants/me/reviews";
}) {
  const { t } = useTranslation();
  const { data, isLoading } = useFulfillerReviews(basePath);

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">{t("fulfillerReviews.title")}</h1>
        {data && <StarRatingDisplay rating={data.stats.average} count={data.stats.count} />}
      </div>

      {data && data.items.length === 0 && <EmptyState title={t("fulfillerReviews.empty")} />}

      <div className="flex flex-col gap-3">
        {data?.items.map((review) => (
          <ReviewRow key={review.id} review={review} basePath={basePath} />
        ))}
      </div>
    </div>
  );
}

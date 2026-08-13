import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useProduct, useNotifyMe } from "@/features/catalog/hooks";
import { useReviewsOfUser } from "@/features/reviews/hooks";
import { useCreateExpressCheckout } from "@/features/orders/hooks";
import { WishlistToggle } from "@/features/wishlist/WishlistToggle";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/Alert";
import { StarRatingDisplay } from "@/components/ui/StarRating";

const STATUS_TONE = {
  available: "success",
  low_stock: "warning",
  out_of_stock: "danger",
  coming_soon: "neutral",
} as const;

export function ProductDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading } = useProduct(id);
  const { data: reviewData } = useReviewsOfUser(product?.ownerId);
  const notifyMe = useNotifyMe();
  const checkout = useCreateExpressCheckout();
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  if (isLoading || !product) return <PageSpinner />;

  const canBuy = product.status !== "coming_soon" && product.status !== "out_of_stock";
  const images = product.images.length > 0 ? product.images : [];

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <div className="aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
          {images[activeImage]?.url ? (
            <img
              src={images[activeImage].url ?? undefined}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-400">
              {t("catalog.noImage")}
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setActiveImage(i)}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 ${
                  i === activeImage ? "border-brand-600" : "border-transparent"
                }`}
              >
                {img.url && <img src={img.url} alt="" className="h-full w-full object-cover" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-neutral-900">{product.name}</h1>
          <WishlistToggle productId={product.id} />
        </div>

        <div className="flex items-center gap-3">
          <Badge tone={STATUS_TONE[product.status]}>{t(`productStatus.${product.status}`)}</Badge>
          {reviewData && reviewData.stats.count > 0 && (
            <StarRatingDisplay rating={reviewData.stats.average} count={reviewData.stats.count} />
          )}
        </div>

        <p className="text-3xl font-bold text-neutral-900">
          {Number(product.price).toFixed(2)} {t("common.egp")}
          <span className="ms-2 text-sm font-normal text-neutral-500">
            + {Number(product.shippingCost).toFixed(2)} {t("catalog.product.shipping")}
          </span>
        </p>

        <p className="text-sm text-neutral-700">{product.shortDescription}</p>

        <dl className="grid grid-cols-2 gap-3 rounded-lg border border-neutral-200 p-4 text-sm">
          <div>
            <dt className="text-neutral-500">{t("catalog.product.countryOfOrigin")}</dt>
            <dd className="font-medium text-neutral-900">{product.countryOfOrigin}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">{t("catalog.product.warranty")}</dt>
            <dd className="font-medium text-neutral-900">
              {product.warrantyAvailable ? t("common.yes") : t("common.no")}
            </dd>
          </div>
          {product.category && (
            <div>
              <dt className="text-neutral-500">{t("catalog.product.category")}</dt>
              <dd className="font-medium text-neutral-900">{product.category.nameEn}</dd>
            </div>
          )}
          {product.brand && (
            <div>
              <dt className="text-neutral-500">{t("catalog.product.brand")}</dt>
              <dd className="font-medium text-neutral-900">{product.brand.name}</dd>
            </div>
          )}
        </dl>

        {canBuy ? (
          <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
            <label className="flex items-center gap-3 text-sm">
              {t("catalog.product.quantity")}
              <input
                type="number"
                min={1}
                max={product.availableQuantity}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-20 rounded-md border border-neutral-300 px-2 py-1"
              />
            </label>
            <ErrorAlert error={checkout.error} />
            <Button
              loading={checkout.isPending}
              onClick={() =>
                checkout.mutate(
                  { productId: product.id, quantity },
                  { onSuccess: (order) => void navigate(`/orders/${order.id}`) },
                )
              }
            >
              {t("catalog.product.buyNow")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
            <p className="text-sm text-neutral-600">{t("catalog.product.unavailable")}</p>
            <Button
              variant="secondary"
              loading={notifyMe.isPending}
              disabled={notifyMe.isSuccess}
              onClick={() => notifyMe.mutate(product.id)}
            >
              {notifyMe.isSuccess
                ? t("catalog.product.notifySubscribed")
                : t("catalog.product.notifyMe")}
            </Button>
          </div>
        )}

        <div className="prose prose-sm max-w-none text-neutral-700">
          <h2 className="text-sm font-semibold text-neutral-900">
            {t("catalog.product.description")}
          </h2>
          <p className="whitespace-pre-wrap">{product.detailedDescription}</p>
        </div>

        {product.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {product.tags.map((t2) => (
              <Badge key={t2.tag}>{t2.tag}</Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

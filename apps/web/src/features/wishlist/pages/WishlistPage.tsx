import { useTranslation } from "react-i18next";
import { useWishlist } from "@/features/wishlist/hooks";
import { ProductCard } from "@/features/catalog/ProductCard";
import { WishlistToggle } from "@/features/wishlist/WishlistToggle";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

export function WishlistPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useWishlist();

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">{t("wishlist.page.title")}</h1>

      {data && data.length === 0 && (
        <EmptyState title={t("wishlist.page.empty")} hint={t("wishlist.page.emptyHint")} />
      )}

      {data && data.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.map((item) => (
            <ProductCard
              key={item.id}
              product={item.product}
              action={<WishlistToggle productId={item.productId} />}
            />
          ))}
        </div>
      )}
    </div>
  );
}

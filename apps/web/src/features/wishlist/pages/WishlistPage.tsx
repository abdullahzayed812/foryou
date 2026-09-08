import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useWishlist } from "@/features/wishlist/hooks";
import { ProductCard } from "@/features/catalog/ProductCard";
import { WishlistToggle } from "@/features/wishlist/WishlistToggle";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeartIcon } from "@/components/ui/icons";

export function WishlistPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useWishlist();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("wishlist.page.title")} />

      {isLoading && <CardGridSkeleton tiles={8} />}

      {!isLoading && data && data.length === 0 && (
        <EmptyState
          icon={<HeartIcon />}
          title={t("wishlist.page.empty")}
          hint={t("wishlist.page.emptyHint")}
          action={
            <Link to="/products">
              <Button fullWidth={false}>{t("nav.browse")}</Button>
            </Link>
          }
        />
      )}

      {!isLoading && data && data.length > 0 && (
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

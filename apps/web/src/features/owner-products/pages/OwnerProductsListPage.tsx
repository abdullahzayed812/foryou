import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useOwnerProductsList, type OwnerProductsBasePath } from "@/features/owner-products/hooks";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

const STATUS_TONE = {
  available: "success",
  low_stock: "warning",
  out_of_stock: "danger",
  coming_soon: "neutral",
} as const;
const MODERATION_TONE = {
  published: "success",
  pending_review: "warning",
  rejected: "danger",
  hidden: "neutral",
} as const;

export function OwnerProductsListPage({
  basePath,
  editBase,
}: {
  basePath: OwnerProductsBasePath;
  editBase: string;
}) {
  const { t } = useTranslation();
  const { data, isLoading } = useOwnerProductsList(basePath);

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">{t("ownerProducts.list.title")}</h1>
        <Link to={`${editBase}/new`}>
          <Button fullWidth={false}>{t("ownerProducts.list.create")}</Button>
        </Link>
      </div>

      {data && data.length === 0 && (
        <EmptyState
          title={t("ownerProducts.list.empty")}
          hint={t("ownerProducts.list.emptyHint")}
        />
      )}

      {data && data.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.map((product) => {
            const cover = product.images.find((i) => i.isCover) ?? product.images[0];
            return (
              <Link key={product.id} to={`${editBase}/${product.id}`}>
                <div className="flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <div className="relative aspect-square w-full overflow-hidden bg-neutral-100">
                    {cover?.url ? (
                      <img
                        src={cover.url}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-neutral-400">
                        {t("catalog.noImage")}
                      </div>
                    )}
                    <div className="absolute start-2 top-2">
                      <Badge tone={MODERATION_TONE[product.moderationStatus]}>
                        {t(`productModerationStatus.${product.moderationStatus}`)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 p-3">
                    <span className="line-clamp-2 text-sm font-medium text-neutral-900">
                      {product.name}
                    </span>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-base font-bold text-neutral-900">
                        {Number(product.price).toFixed(2)} {t("common.egp")}
                      </span>
                      <Badge tone={STATUS_TONE[product.status]}>
                        {t(`productStatus.${product.status}`)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

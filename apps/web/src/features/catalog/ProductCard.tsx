import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/Badge";
import { BoxIcon } from "@/components/ui/icons";
import type { Product } from "./types";

const STATUS_TONE: Record<Product["status"], "success" | "warning" | "danger" | "neutral"> = {
  available: "success",
  low_stock: "warning",
  out_of_stock: "danger",
  coming_soon: "neutral",
};

export function ProductCard({ product, action }: { product: Product; action?: ReactNode }) {
  const { t } = useTranslation();
  const cover = product.images.find((i) => i.isCover) ?? product.images[0];

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <Link to={`/products/${product.id}`} className="block">
        <div className="relative aspect-square w-full overflow-hidden bg-neutral-100">
          {cover?.url ? (
            <img
              src={cover.url}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-300">
              <span className="h-10 w-10">
                <BoxIcon />
              </span>
            </div>
          )}
          <span className="absolute bottom-2 start-2">
            <Badge tone={STATUS_TONE[product.status]}>{t(`productStatus.${product.status}`)}</Badge>
          </span>
        </div>
      </Link>
      {action && <div className="absolute end-2 top-2">{action}</div>}
      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.brand?.name && (
          <span className="text-xs font-medium tracking-wide text-neutral-400 uppercase">
            {product.brand.name}
          </span>
        )}
        <Link
          to={`/products/${product.id}`}
          className="line-clamp-2 text-sm font-medium text-neutral-900 hover:text-brand-700"
        >
          {product.name}
        </Link>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-base font-bold text-brand-700">
            {Number(product.price).toFixed(2)} {t("common.egp")}
          </span>
          <span className="truncate text-xs text-neutral-500">{product.countryOfOrigin}</span>
        </div>
      </div>
    </div>
  );
}

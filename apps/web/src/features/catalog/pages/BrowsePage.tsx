import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useBrowseProducts, useCategories } from "@/features/catalog/hooks";
import { ProductCard } from "@/features/catalog/ProductCard";
import { WishlistToggle } from "@/features/wishlist/WishlistToggle";
import { TextField } from "@/components/ui/TextField";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import type { BrowseQuery } from "@/features/catalog/types";

export function BrowsePage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const query: BrowseQuery = {
    q: params.get("q") ?? undefined,
    categoryId: params.get("categoryId") ?? undefined,
    sort: (params.get("sort") as BrowseQuery["sort"]) ?? "newest",
    limit: 24,
  };

  const { data, isLoading } = useBrowseProducts(query);
  const { data: categories } = useCategories();

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">{t("catalog.browse.title")}</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateParam("q", q);
        }}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
      >
        <div className="min-w-[220px] flex-1">
          <TextField
            label={t("catalog.browse.search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select
            label={t("catalog.browse.category")}
            value={params.get("categoryId") ?? ""}
            onChange={(e) => updateParam("categoryId", e.target.value)}
          >
            <option value="">{t("catalog.browse.allCategories")}</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameEn}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select
            label={t("catalog.browse.sort")}
            value={params.get("sort") ?? "newest"}
            onChange={(e) => updateParam("sort", e.target.value)}
          >
            <option value="newest">{t("catalog.browse.sortNewest")}</option>
            <option value="lowest_price">{t("catalog.browse.sortLowestPrice")}</option>
            <option value="highest_price">{t("catalog.browse.sortHighestPrice")}</option>
          </Select>
        </div>
        <Button type="submit" fullWidth={false}>
          {t("catalog.browse.searchSubmit")}
        </Button>
      </form>

      {isLoading && <PageSpinner />}

      {!isLoading && data?.items.length === 0 && (
        <EmptyState title={t("catalog.browse.empty")} hint={t("catalog.browse.emptyHint")} />
      )}

      {!isLoading && data && data.items.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.items.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              action={<WishlistToggle productId={product.id} />}
            />
          ))}
        </div>
      )}
    </div>
  );
}

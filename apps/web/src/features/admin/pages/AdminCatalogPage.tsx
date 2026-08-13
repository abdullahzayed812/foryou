import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCategories, useBrands } from "@/features/catalog/hooks";
import {
  useCreateCategory,
  useDeleteCategory,
  useCreateBrand,
  useDeleteBrand,
} from "@/features/admin/hooks";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ErrorAlert } from "@/components/ui/Alert";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function CategoriesPanel() {
  const { t } = useTranslation();
  const { data: categories } = useCategories();
  const create = useCreateCategory();
  const remove = useDeleteCategory();
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-neutral-900">{t("admin.catalog.categories")}</h2>
      <ErrorAlert error={create.error ?? remove.error} />
      <div className="flex flex-wrap gap-2">
        {categories?.map((c) => (
          <span
            key={c.id}
            className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-sm"
          >
            {c.nameEn}
            <button
              type="button"
              onClick={() => remove.mutate(c.id)}
              className="text-neutral-400 hover:text-red-600"
              aria-label={t("common.remove")}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <TextField
            label={t("admin.catalog.nameEn")}
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <TextField
            label={t("admin.catalog.nameAr")}
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
          />
        </div>
        <Button
          fullWidth={false}
          loading={create.isPending}
          disabled={!nameEn || !nameAr}
          onClick={() =>
            create.mutate(
              { nameEn, nameAr, slug: slugify(nameEn) },
              {
                onSuccess: () => {
                  setNameEn("");
                  setNameAr("");
                },
              },
            )
          }
        >
          {t("common.save")}
        </Button>
      </div>
    </Card>
  );
}

function BrandsPanel() {
  const { t } = useTranslation();
  const { data: brands } = useBrands();
  const create = useCreateBrand();
  const remove = useDeleteBrand();
  const [name, setName] = useState("");

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-neutral-900">{t("admin.catalog.brands")}</h2>
      <ErrorAlert error={create.error ?? remove.error} />
      <div className="flex flex-wrap gap-2">
        {brands?.map((b) => (
          <span
            key={b.id}
            className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-sm"
          >
            {b.name}
            <button
              type="button"
              onClick={() => remove.mutate(b.id)}
              className="text-neutral-400 hover:text-red-600"
              aria-label={t("common.remove")}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <TextField
            label={t("admin.catalog.brandName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <Button
          fullWidth={false}
          loading={create.isPending}
          disabled={!name}
          onClick={() =>
            create.mutate({ name, slug: slugify(name) }, { onSuccess: () => setName("") })
          }
        >
          {t("common.save")}
        </Button>
      </div>
    </Card>
  );
}

export function AdminCatalogPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">{t("admin.catalog.title")}</h1>
      <CategoriesPanel />
      <BrandsPanel />
    </div>
  );
}

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createProductSchema, COUNTRIES } from "@foryou/shared";
import { useCategories, useBrands } from "@/features/catalog/hooks";
import {
  useOwnerProduct,
  useCreateOwnerProduct,
  useUpdateOwnerProduct,
  useReplaceOwnerProductImages,
  type OwnerProductsBasePath,
} from "@/features/owner-products/hooks";
import type { ProductImageInput } from "@/features/owner-products/api";
import type { Product } from "@/features/catalog/types";
import { ImagesUploader } from "@/features/owner-products/ImagesUploader";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { TextArea } from "@/components/ui/TextArea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/Alert";
import { PageSpinner } from "@/components/ui/Spinner";

interface Category {
  id: string;
  nameEn: string;
}
interface Brand {
  id: string;
  name: string;
}

/**
 * Keyed by `existing?.id ?? "new"` from the parent so remounting (not an
 * effect) is what seeds form state from fetched data — avoids the
 * set-state-in-effect cascading-render pattern React now flags.
 */
function ProductFormBody({
  existing,
  isEdit,
  categories,
  brands,
  basePath,
  listPath,
}: {
  existing: Product | undefined;
  isEdit: boolean;
  categories: Category[] | undefined;
  brands: Brand[] | undefined;
  basePath: OwnerProductsBasePath;
  listPath: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const create = useCreateOwnerProduct(basePath);
  const update = useUpdateOwnerProduct(basePath);
  const replaceImages = useReplaceOwnerProductImages(basePath);

  const [name, setName] = useState(existing?.name ?? "");
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? "");
  const [brandId, setBrandId] = useState(existing?.brandId ?? "");
  const [shortDescription, setShortDescription] = useState(existing?.shortDescription ?? "");
  const [detailedDescription, setDetailedDescription] = useState(
    existing?.detailedDescription ?? "",
  );
  const [countryOfOrigin, setCountryOfOrigin] = useState(existing?.countryOfOrigin ?? "");
  const [price, setPrice] = useState(existing?.price ?? "");
  const [shippingCost, setShippingCost] = useState(existing?.shippingCost ?? "0");
  const [availableQuantity, setAvailableQuantity] = useState(
    String(existing?.availableQuantity ?? 0),
  );
  const [warrantyAvailable, setWarrantyAvailable] = useState(existing?.warrantyAvailable ?? false);
  const [isComingSoon, setIsComingSoon] = useState(existing?.status === "coming_soon");
  const [tagsText, setTagsText] = useState(existing?.tags.map((t2) => t2.tag).join(", ") ?? "");
  const [images, setImages] = useState<ProductImageInput[]>(
    existing?.images.map((img) => ({
      mediaAssetId: img.mediaAssetId,
      isCover: img.isCover,
      isCountryOfOrigin: img.isCountryOfOrigin,
    })) ?? [],
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const tags = tagsText
    .split(",")
    .map((t2) => t2.trim())
    .filter(Boolean);

  const fields = {
    name,
    categoryId,
    brandId,
    shortDescription,
    detailedDescription,
    countryOfOrigin,
    price: Number(price),
    shippingCost: Number(shippingCost),
    availableQuantity: Number(availableQuantity),
    warrantyAvailable,
    isComingSoon,
    tags,
    images,
  };

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    // Checked explicitly (not left to createProductSchema's own `images`
    // min-length failure) so the user sees an actionable message instead of
    // zod's raw "Too small: expected array to have >=1 items".
    if (images.length === 0) {
      setValidationError(t("ownerProducts.form.imagesRequired"));
      return;
    }

    if (isEdit && id) {
      const { images: _imgs, ...updateFields } = fields;
      update.mutate(
        { id, data: updateFields },
        {
          onSuccess: () => {
            replaceImages.mutate({ id, images }, { onSuccess: () => void navigate(listPath) });
          },
        },
      );
      return;
    }

    const parsed = createProductSchema.safeParse(fields);
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? t("errors.VALIDATION_FAILED"));
      return;
    }
    create.mutate(parsed.data, { onSuccess: () => void navigate(listPath) });
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold text-neutral-900">
        {isEdit ? t("ownerProducts.form.editTitle") : t("ownerProducts.form.createTitle")}
      </h1>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <ErrorAlert error={create.error ?? update.error ?? replaceImages.error} />
        {validationError && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {validationError}
          </div>
        )}

        <TextField
          label={t("ownerProducts.form.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label={t("catalog.product.category")}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            <option value="" disabled>
              {t("ownerProducts.form.selectOne")}
            </option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameEn}
              </option>
            ))}
          </Select>
          <Select
            label={t("catalog.product.brand")}
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            required
          >
            <option value="" disabled>
              {t("ownerProducts.form.selectOne")}
            </option>
            {brands?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>

        <TextField
          label={t("ownerProducts.form.shortDescription")}
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          required
        />
        <TextArea
          label={t("ownerProducts.form.detailedDescription")}
          rows={4}
          value={detailedDescription}
          onChange={(e) => setDetailedDescription(e.target.value)}
          required
        />
        <Select
          label={t("catalog.product.countryOfOrigin")}
          value={countryOfOrigin}
          onChange={(e) => setCountryOfOrigin(e.target.value)}
          required
        >
          <option value="" disabled>
            {t("ownerProducts.form.selectOne")}
          </option>
          {COUNTRIES.map((code) => (
            <option key={code} value={code}>
              {t(`countries.${code}`)}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-3 gap-4">
          <TextField
            label={t("ownerProducts.form.price")}
            type="number"
            min={0.01}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          <TextField
            label={t("ownerProducts.form.shippingCost")}
            type="number"
            min={0}
            step="0.01"
            value={shippingCost}
            onChange={(e) => setShippingCost(e.target.value)}
          />
          <TextField
            label={t("ownerProducts.form.quantity")}
            type="number"
            min={0}
            value={availableQuantity}
            onChange={(e) => setAvailableQuantity(e.target.value)}
          />
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={warrantyAvailable}
              onChange={(e) => setWarrantyAvailable(e.target.checked)}
            />
            {t("catalog.product.warranty")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isComingSoon}
              onChange={(e) => setIsComingSoon(e.target.checked)}
            />
            {t("ownerProducts.form.comingSoon")}
          </label>
        </div>

        <TextField
          label={t("ownerProducts.form.tags")}
          hint={t("ownerProducts.form.tagsHint")}
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
        />

        <ImagesUploader images={images} onChange={setImages} />

        <Button
          type="submit"
          loading={create.isPending || update.isPending || replaceImages.isPending}
        >
          {t("common.save")}
        </Button>
      </form>
    </Card>
  );
}

export function OwnerProductFormPage({
  basePath,
  listPath,
}: {
  basePath: OwnerProductsBasePath;
  listPath: string;
}) {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== "new";

  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const { data: existing, isLoading: loadingExisting } = useOwnerProduct(
    basePath,
    isEdit ? id : undefined,
  );

  if (isEdit && loadingExisting) return <PageSpinner />;

  return (
    <ProductFormBody
      key={existing?.id ?? "new"}
      existing={existing}
      isEdit={isEdit}
      categories={categories}
      brands={brands}
      basePath={basePath}
      listPath={listPath}
    />
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { mediaApi, uploadMediaAsset } from "@/features/media/api";
import type { ProductImageInput } from "./api";

interface StagedImage extends ProductImageInput {
  previewUrl: string;
}

const MAX_IMAGES = 8;

/** Upload up to 8 product images, marking exactly one as cover and one as country-of-origin (BRD Rule 6). */
export function ImagesUploader({
  images,
  onChange,
}: {
  images: ProductImageInput[];
  onChange: (images: ProductImageInput[]) => void;
}) {
  const { t } = useTranslation();
  const [staged, setStaged] = useState<StagedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - images.length;
    const selected = Array.from(files).slice(0, remaining);
    if (selected.length === 0) return;

    setError(null);
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        selected.map(async (file) => {
          const mediaAssetId = await uploadMediaAsset(file, "product_image");
          return {
            mediaAssetId,
            isCover: images.length === 0,
            isCountryOfOrigin: images.length === 0,
            previewUrl: URL.createObjectURL(file),
          };
        }),
      );
      setStaged((s) => [...s, ...uploaded]);
      onChange([...images, ...uploaded.map(({ previewUrl: _p, ...rest }) => rest)]);
    } catch {
      setError(t("ownerProducts.form.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  function setFlag(index: number, flag: "isCover" | "isCountryOfOrigin") {
    onChange(images.map((img, i) => ({ ...img, [flag]: i === index })));
  }

  function remove(index: number) {
    const target = images[index];
    // Only free the underlying upload for images staged (uploaded) in this
    // session — a pre-existing image being edited is still referenced by the
    // saved product until the form actually submits the reduced list, so
    // deleting its asset now would fail the backend's in-use check anyway.
    const wasStagedThisSession = staged.some((s) => s.mediaAssetId === target?.mediaAssetId);
    if (target && wasStagedThisSession) {
      mediaApi.remove(target.mediaAssetId).catch(() => {
        // Best-effort cleanup — the image is already gone from this form
        // either way, so a failed delete here isn't worth surfacing.
      });
    }
    onChange(images.filter((_, i) => i !== index));
    setStaged((s) => s.filter((_, i) => i !== index));
  }

  function previewFor(index: number): string | undefined {
    return staged[index]?.previewUrl;
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-neutral-800">
        {t("ownerProducts.form.images")} ({images.length}/{MAX_IMAGES})
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {uploading && (
        <div className="flex items-center gap-2 text-xs text-neutral-600">
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600"
          />
          {t("ownerProducts.form.uploading")}
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {images.map((img, i) => (
            <div
              key={img.mediaAssetId}
              className="flex flex-col gap-1 rounded-md border border-neutral-200 p-2"
            >
              {previewFor(i) && (
                <img
                  src={previewFor(i)}
                  alt=""
                  className="aspect-square w-full rounded object-cover"
                />
              )}
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="radio"
                  name="cover"
                  checked={img.isCover}
                  onChange={() => setFlag(i, "isCover")}
                />
                {t("ownerProducts.form.cover")}
              </label>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="radio"
                  name="origin"
                  checked={img.isCountryOfOrigin}
                  onChange={() => setFlag(i, "isCountryOfOrigin")}
                />
                {t("ownerProducts.form.originPhoto")}
              </label>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-xs text-red-600 hover:underline"
              >
                {t("common.remove")}
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length < MAX_IMAGES && (
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={uploading}
          onChange={(e) => void onFilesSelected(e.target.files)}
          className="text-sm"
        />
      )}
    </div>
  );
}

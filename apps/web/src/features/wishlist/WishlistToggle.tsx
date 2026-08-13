import { useTranslation } from "react-i18next";
import { useWishlist, useToggleWishlist } from "./hooks";

export function WishlistToggle({ productId }: { productId: string }) {
  const { t } = useTranslation();
  const { data: wishlist } = useWishlist();
  const { add, remove } = useToggleWishlist();

  const isWishlisted = wishlist?.some((w) => w.productId === productId) ?? false;
  const pending = add.isPending || remove.isPending;

  return (
    <button
      type="button"
      aria-label={isWishlisted ? t("wishlist.remove") : t("wishlist.add")}
      aria-pressed={isWishlisted}
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isWishlisted) remove.mutate(productId);
        else add.mutate(productId);
      }}
      className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-lg shadow transition-colors ${
        isWishlisted ? "text-red-500" : "text-neutral-400 hover:text-red-400"
      }`}
    >
      {isWishlisted ? "♥" : "♡"}
    </button>
  );
}

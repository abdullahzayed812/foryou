export interface ProductImage {
  id: string;
  mediaAssetId: string;
  position: number;
  isCover: boolean;
  isCountryOfOrigin: boolean;
  url: string | null;
}

export interface ProductTag {
  tag: string;
}

export interface Category {
  id: string;
  nameEn: string;
  nameAr: string;
  slug: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  ownerId: string;
  ownerRole: "seller" | "merchant";
  categoryId: string;
  brandId: string;
  name: string;
  shortDescription: string;
  detailedDescription: string;
  countryOfOrigin: string;
  price: string;
  shippingCost: string;
  availableQuantity: number;
  status: "available" | "low_stock" | "out_of_stock" | "coming_soon";
  warrantyAvailable: boolean;
  moderationStatus: "published" | "pending_review" | "rejected" | "hidden";
  rejectionReason: string | null;
  createdAt: string;
  images: ProductImage[];
  tags: ProductTag[];
  category?: Category | null;
  brand?: Brand | null;
}

export interface BrowseResult {
  items: Product[];
  nextCursor: string | null;
}

export interface BrowseQuery {
  q?: string;
  categoryId?: string;
  brandSlug?: string;
  status?: Product["status"];
  priceMin?: number;
  priceMax?: number;
  sort?: "newest" | "best_selling" | "highest_rated" | "lowest_price" | "highest_price";
  cursor?: string;
  limit?: number;
}

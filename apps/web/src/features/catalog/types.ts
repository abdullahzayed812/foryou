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
  lifecycle: "wanted" | "importing" | "express";
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

/** FOR YOU WANTED — current demand-testing engagement for a product. */
export interface WantedView {
  lifecycle: "wanted" | "importing" | "express";
  cycle: {
    id: string;
    cycleNumber: number;
    status: "active" | "importing" | "completed";
    likeCount: number;
    notifyCount: number;
    createdAt: string;
  } | null;
  viewerLiked: boolean;
  viewerNotified: boolean;
}

/** One completed/ongoing WANTED cycle with its seller/merchant analytics. */
export interface WantedCycleAnalytics {
  id: string;
  cycleNumber: number;
  status: "active" | "importing" | "completed";
  likes: number;
  notifyRequests: number;
  importedQuantity: number | null;
  unitsSold: number | null;
  remainingStock: number | null;
  createdAt: string;
  importingAt: string | null;
  completedAt: string | null;
  notifyToPurchase: { notified: number; purchased: number; rate: number } | null;
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

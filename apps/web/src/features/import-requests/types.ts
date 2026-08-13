import type { CountryCode } from "@foryou/shared";

export interface ImportRequestNotes {
  color?: string;
  size?: string;
  quantity?: string;
  preferences?: string;
}

export interface ImportRequestLink {
  id: string;
  url: string;
}

export type ImportRequestStatus = "open" | "offer_selected" | "closed" | "expired";

export interface ImportRequest {
  id: string;
  customerId: string;
  notes: ImportRequestNotes | null;
  sourceCountry: CountryCode | null;
  status: ImportRequestStatus;
  depositDeadlineStrikes: number;
  createdAt: string;
  updatedAt: string;
  links: ImportRequestLink[];
  /** Present on requests returned to a seller (queue list + detail). */
  customerName?: string | null;
  customerMemberSince?: string | null;
}

export type OfferStatus = "active" | "selected" | "rejected" | "cancelled";

export interface Offer {
  id: string;
  importRequestId: string;
  sellerId: string;
  totalPrice: string;
  estimatedDeliveryDays: number;
  depositPercentage: 20 | 30 | 40 | 50;
  status: OfferStatus;
  createdAt: string;
  updatedAt: string;
  /** Present on offers returned to the customer (`GET /import-requests/:id/offers`). */
  sellerName?: string | null;
  sellerMemberSince?: string | null;
  /** Present on offers returned to the seller (`GET /offers/me`). */
  customerName?: string | null;
  customerMemberSince?: string | null;
}

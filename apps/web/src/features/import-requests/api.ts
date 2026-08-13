import { apiClient } from "@/lib/api-client";
import type { CountryCode } from "@foryou/shared";
import type { ImportRequest, Offer, ImportRequestNotes } from "./types";
import type { Order } from "@/features/orders/types";

export const importRequestsApi = {
  create: (input: {
    links: string[];
    notes?: ImportRequestNotes;
    sourceCountry?: CountryCode;
  }) => apiClient.post<ImportRequest>("/import-requests", input).then((r) => r.data),

  listMine: () => apiClient.get<ImportRequest[]>("/import-requests/me").then((r) => r.data),

  get: (id: string) => apiClient.get<ImportRequest>(`/import-requests/${id}`).then((r) => r.data),

  cancel: (id: string) =>
    apiClient.post<ImportRequest>(`/import-requests/${id}/cancel`).then((r) => r.data),

  listOffers: (requestId: string) =>
    apiClient.get<Offer[]>(`/import-requests/${requestId}/offers`).then((r) => r.data),
};

export const sellerImportRequestsApi = {
  listOpen: () => apiClient.get<ImportRequest[]>("/sellers/me/import-requests").then((r) => r.data),
  get: (id: string) =>
    apiClient.get<ImportRequest>(`/sellers/me/import-requests/${id}`).then((r) => r.data),
  ignore: (id: string) =>
    apiClient.post(`/sellers/me/import-requests/${id}/ignore`).then((r) => r.data),
};

export const offersApi = {
  select: (offerId: string) =>
    apiClient.post<Order>(`/offers/${offerId}/select`).then((r) => r.data),
  listMine: () => apiClient.get<Offer[]>("/offers/me").then((r) => r.data),
  submit: (
    requestId: string,
    input: {
      totalPrice: number;
      estimatedDeliveryDays: number;
      depositPercentage: 20 | 30 | 40 | 50;
    },
  ) => apiClient.post<Offer>(`/import-requests/${requestId}/offers`, input).then((r) => r.data),
  edit: (
    offerId: string,
    input: Partial<{
      totalPrice: number;
      estimatedDeliveryDays: number;
      depositPercentage: 20 | 30 | 40 | 50;
    }>,
  ) => apiClient.patch<Offer>(`/offers/${offerId}`, input).then((r) => r.data),
  cancel: (offerId: string) => apiClient.delete(`/offers/${offerId}`).then((r) => r.data),
};

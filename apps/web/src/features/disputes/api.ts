import type { DisputeReason } from "@foryou/shared";
import { apiClient } from "@/lib/api-client";
import type { Dispute } from "./types";

export const disputesApi = {
  open: (input: {
    orderId: string;
    reason: DisputeReason;
    description: string;
    photoMediaAssetIds: string[];
    videoMediaAssetIds?: string[];
  }) => apiClient.post<Dispute>("/disputes", input).then((r) => r.data),

  listMine: () => apiClient.get<Dispute[]>("/disputes/me").then((r) => r.data),

  get: (id: string) => apiClient.get<Dispute>(`/disputes/${id}`).then((r) => r.data),
};

/** Fulfiller-scoped — same endpoints under /sellers/me/disputes or /merchants/me/disputes. */
export function createFulfillerDisputesApi(
  basePath: "/sellers/me/disputes" | "/merchants/me/disputes",
) {
  return {
    list: () => apiClient.get<Dispute[]>(basePath).then((r) => r.data),
    get: (id: string) => apiClient.get<Dispute>(`${basePath}/${id}`).then((r) => r.data),
    respond: (disputeId: string, response: string) =>
      apiClient.post<Dispute>(`${basePath}/${disputeId}/respond`, { response }).then((r) => r.data),
  };
}

import { apiClient } from "@/lib/api-client";
import type { VerificationRequest } from "./types";

export const verificationApi = {
  listMine: () => apiClient.get<VerificationRequest[]>("/verification/me").then((r) => r.data),

  submitIdentity: (input: { nationalIdMediaAssetId: string; selfieMediaAssetId: string }) =>
    apiClient.post<VerificationRequest>("/verification/identity", input).then((r) => r.data),

  submitBusiness: (input: { commercialRegistrationMediaAssetId: string }) =>
    apiClient.post<VerificationRequest>("/verification/business", input).then((r) => r.data),
};

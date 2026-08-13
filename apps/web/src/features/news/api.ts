import { apiClient } from "@/lib/api-client";

export interface NewsPost {
  id: string;
  authorId: string;
  title: string;
  body: string;
  coverMediaAssetId: string | null;
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const newsApi = {
  list: () => apiClient.get<NewsPost[]>("/news").then((r) => r.data),
  get: (id: string) => apiClient.get<NewsPost>(`/news/${id}`).then((r) => r.data),
};

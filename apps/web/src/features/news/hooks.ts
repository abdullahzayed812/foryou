import { useQuery } from "@tanstack/react-query";
import { newsApi } from "./api";

export function useNewsList() {
  return useQuery({ queryKey: ["news"], queryFn: newsApi.list });
}

export function useNewsPost(id: string | undefined) {
  return useQuery({
    queryKey: ["news", id],
    queryFn: () => newsApi.get(id!),
    enabled: Boolean(id),
  });
}

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useNewsList } from "@/features/news/hooks";
import { Card } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

export function NewsListPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useNewsList();

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">{t("news.list.title")}</h1>

      {data && data.length === 0 && <EmptyState title={t("news.list.empty")} />}

      <div className="flex flex-col gap-3">
        {data?.map((post) => (
          <Link key={post.id} to={`/news/${post.id}`}>
            <Card className="p-4 transition-shadow hover:shadow-md">
              <p className="font-semibold text-neutral-900">{post.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{post.body}</p>
              <p className="mt-2 text-xs text-neutral-400">
                {post.publishedAt && new Date(post.publishedAt).toLocaleDateString()}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

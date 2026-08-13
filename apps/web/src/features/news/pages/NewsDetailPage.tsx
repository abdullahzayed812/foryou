import { useParams } from "react-router-dom";
import { useNewsPost } from "@/features/news/hooks";
import { Card } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";

export function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: post, isLoading } = useNewsPost(id);

  if (isLoading || !post) return <PageSpinner />;

  return (
    <Card className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-neutral-900">{post.title}</h1>
      <p className="mt-1 text-sm text-neutral-400">
        {post.publishedAt && new Date(post.publishedAt).toLocaleDateString()}
      </p>
      <div className="prose prose-sm mt-4 max-w-none whitespace-pre-wrap text-neutral-700">
        {post.body}
      </div>
    </Card>
  );
}

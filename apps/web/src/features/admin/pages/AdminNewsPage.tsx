import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useAdminNews,
  useCreateNews,
  usePublishNews,
  useUnpublishNews,
  useDeleteNews,
} from "@/features/admin/hooks";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { TextArea } from "@/components/ui/TextArea";
import { ErrorAlert } from "@/components/ui/Alert";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

export function AdminNewsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useAdminNews();
  const create = useCreateNews();
  const publish = usePublishNews();
  const unpublish = useUnpublishNews();
  const remove = useDeleteNews();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">{t("admin.news.title")}</h1>

      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-700">{t("admin.news.create")}</h2>
        <ErrorAlert error={create.error} />
        <TextField
          label={t("admin.news.postTitle")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <TextArea
          label={t("admin.news.postBody")}
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button
          fullWidth={false}
          loading={create.isPending}
          disabled={!title || !body}
          onClick={() =>
            create.mutate(
              { title, body },
              {
                onSuccess: () => {
                  setTitle("");
                  setBody("");
                },
              },
            )
          }
        >
          {t("common.save")}
        </Button>
      </Card>

      {isLoading ? (
        <PageSpinner />
      ) : (
        <>
          {data && data.length === 0 && <EmptyState title={t("admin.news.empty")} />}
          <div className="flex flex-col gap-3">
            {data?.map((post) => (
              <Card key={post.id} className="flex items-start justify-between gap-4 p-4">
                <div>
                  <p className="font-medium text-neutral-900">{post.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{post.body}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={post.status === "published" ? "success" : "neutral"}>
                    {t(`newsStatus.${post.status}`)}
                  </Badge>
                  {post.status === "draft" ? (
                    <Button fullWidth={false} onClick={() => publish.mutate(post.id)}>
                      {t("admin.news.publish")}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      fullWidth={false}
                      onClick={() => unpublish.mutate(post.id)}
                    >
                      {t("admin.news.unpublish")}
                    </Button>
                  )}
                  <Button variant="ghost" fullWidth={false} onClick={() => remove.mutate(post.id)}>
                    {t("common.remove")}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

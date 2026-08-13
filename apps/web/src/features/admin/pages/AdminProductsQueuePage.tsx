import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminProductsQueue, useApproveProduct, useRejectProduct } from "@/features/admin/hooks";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorAlert } from "@/components/ui/Alert";
import type { Product } from "@/features/catalog/types";

function QueueRow({ product }: { product: Product }) {
  const { t } = useTranslation();
  const approve = useApproveProduct();
  const reject = useRejectProduct();
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const cover = product.images.find((i) => i.isCover) ?? product.images[0];

  return (
    <Card className="flex items-start gap-4 p-4">
      {cover?.url && (
        <img src={cover.url} alt="" className="h-20 w-20 shrink-0 rounded object-cover" />
      )}
      <div className="flex-1">
        {/* No link to the public product page here — a pending_review
            product 404s on GET /products/:id by design (only published
            products are publicly readable), so this is deliberately plain text. */}
        <p className="font-medium text-neutral-900">{product.name}</p>
        <p className="text-sm text-neutral-500">
          {Number(product.price).toFixed(2)} {t("common.egp")} · {product.countryOfOrigin}
        </p>
        <ErrorAlert error={approve.error ?? reject.error} />
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            fullWidth={false}
            loading={approve.isPending}
            onClick={() => approve.mutate(product.id)}
          >
            {t("admin.products.approve")}
          </Button>
          <Button variant="secondary" fullWidth={false} onClick={() => setShowReject((s) => !s)}>
            {t("admin.products.reject")}
          </Button>
        </div>
        {showReject && (
          <div className="mt-2 flex items-end gap-2">
            <div className="flex-1">
              <TextField
                label={t("admin.verification.reasonLabel")}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              fullWidth={false}
              loading={reject.isPending}
              disabled={!reason}
              onClick={() =>
                reject.mutate({ id: product.id, reason }, { onSuccess: () => setShowReject(false) })
              }
            >
              {t("common.submit")}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export function AdminProductsQueuePage() {
  const { t } = useTranslation();
  const { data, isLoading } = useAdminProductsQueue();

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">{t("admin.products.title")}</h1>
      {data && data.length === 0 && <EmptyState title={t("admin.products.empty")} />}
      <div className="flex flex-col gap-3">
        {data?.map((product) => (
          <QueueRow key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

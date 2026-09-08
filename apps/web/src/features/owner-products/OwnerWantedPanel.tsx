import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Product } from "@/features/catalog/types";
import {
  useOwnerWantedCycles,
  useOwnerWantedTransitions,
  type OwnerProductsBasePath,
} from "./hooks";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TextField } from "@/components/ui/TextField";
import { ErrorAlert } from "@/components/ui/Alert";

/**
 * Seller/Merchant FOR YOU WANTED controls + analytics for one product.
 * WANTED → IMPORTING → EXPRESS transitions plus a per-cycle performance
 * table (interest → import decision → actual sales). Completed cycles are
 * historical and never change.
 */
export function OwnerWantedPanel({
  basePath,
  product,
}: {
  basePath: OwnerProductsBasePath;
  product: Product;
}) {
  const { t } = useTranslation();
  const { data: cycles } = useOwnerWantedCycles(basePath, product.id);
  const { startWanted, startImporting, completeImport } = useOwnerWantedTransitions(
    basePath,
    product.id,
  );
  const [qty, setQty] = useState("");

  const openCycle = cycles?.find((c) => c.status !== "completed");
  const error =
    startWanted.error ?? startImporting.error ?? completeImport.error ?? null;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-neutral-900">{t("wanted.owner.title")}</h2>
        <Badge tone={product.lifecycle === "express" ? "success" : "brand"}>
          {t(`wanted.lifecycle.${product.lifecycle}`)}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-neutral-600">{t("wanted.owner.hint")}</p>

      <ErrorAlert error={error} />

      <div className="mt-4 flex flex-wrap items-end gap-3">
        {product.lifecycle === "express" && (
          <Button
            fullWidth={false}
            loading={startWanted.isPending}
            onClick={() => startWanted.mutate()}
          >
            {t("wanted.owner.start")}
          </Button>
        )}
        {product.lifecycle === "wanted" && (
          <Button
            fullWidth={false}
            loading={startImporting.isPending}
            onClick={() => startImporting.mutate()}
          >
            {t("wanted.owner.startImporting")}
          </Button>
        )}
        {product.lifecycle === "importing" && (
          <>
            <TextField
              label={t("wanted.owner.importedQuantity")}
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
            <Button
              fullWidth={false}
              loading={completeImport.isPending}
              disabled={Number(qty) < 1}
              onClick={() => completeImport.mutate(Number(qty), { onSuccess: () => setQty("") })}
            >
              {t("wanted.owner.completeImport")}
            </Button>
          </>
        )}
      </div>

      {cycles && cycles.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-start text-neutral-500">
                <th className="py-2 text-start">{t("wanted.owner.cycle")}</th>
                <th className="py-2 text-start">❤️ {t("wanted.likes")}</th>
                <th className="py-2 text-start">🔔 {t("wanted.notifyRequests")}</th>
                <th className="py-2 text-start">📦 {t("wanted.owner.imported")}</th>
                <th className="py-2 text-start">🛒 {t("wanted.owner.sold")}</th>
                <th className="py-2 text-start">📦 {t("wanted.owner.remaining")}</th>
                <th className="py-2 text-start">{t("wanted.owner.conversion")}</th>
                <th className="py-2 text-start">{t("wanted.owner.status")}</th>
              </tr>
            </thead>
            <tbody>
              {cycles.map((c) => (
                <tr key={c.id} className="border-b border-neutral-100">
                  <td className="py-2 font-medium">#{c.cycleNumber}</td>
                  <td className="py-2">{c.likes}</td>
                  <td className="py-2">{c.notifyRequests}</td>
                  <td className="py-2">{c.importedQuantity ?? "—"}</td>
                  <td className="py-2">{c.unitsSold ?? "—"}</td>
                  <td className="py-2">{c.remainingStock ?? "—"}</td>
                  <td className="py-2">
                    {c.notifyToPurchase
                      ? `${c.notifyToPurchase.purchased}/${c.notifyToPurchase.notified} (${Math.round(
                          c.notifyToPurchase.rate * 100,
                        )}%)`
                      : "—"}
                  </td>
                  <td className="py-2">
                    <Badge tone={c.status === "completed" ? "success" : "brand"}>
                      {t(`wanted.cycleStatus.${c.status}`)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {openCycle && (
        <p className="mt-2 text-xs text-neutral-500">{t("wanted.owner.openCycleNote")}</p>
      )}
    </Card>
  );
}

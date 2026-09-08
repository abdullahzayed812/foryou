import { useTranslation } from "react-i18next";
import { useWanted, useWantedInteraction } from "./hooks";
import { useAuthStore } from "@/features/auth/store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

/**
 * FOR YOU WANTED demand-testing panel — shown instead of the buy box while a
 * product's lifecycle is "wanted" or "importing". ❤️ Like and 🔔 Notify Me
 * are two separate signals (§2). Once the product reaches EXPRESS this panel
 * is not rendered and the previous cycle's counts are not shown as current
 * engagement (§6).
 */
export function WantedPanel({ productId }: { productId: string }) {
  const { t } = useTranslation();
  const isAuthed = useAuthStore((s) => s.status === "authenticated");
  const { data } = useWanted(productId);
  const { like, unlike, notify, cancelNotify } = useWantedInteraction(productId);

  const cycle = data?.cycle ?? null;
  const importing = data?.lifecycle === "importing" || cycle?.status === "importing";
  const canInteract = isAuthed && !importing;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-brand-200 bg-brand-50/40 p-4">
      <div className="flex items-center gap-2">
        <Badge tone="brand">{t("wanted.badge")}</Badge>
        {importing && <Badge tone="neutral">{t("wanted.importingBadge")}</Badge>}
      </div>
      <p className="text-sm text-neutral-700">
        {importing ? t("wanted.importingHint") : t("wanted.hint")}
      </p>

      <div className="flex flex-wrap gap-6 text-sm text-neutral-600">
        <span>❤️ {cycle?.likeCount ?? 0} {t("wanted.likes")}</span>
        <span>🔔 {cycle?.notifyCount ?? 0} {t("wanted.notifyRequests")}</span>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          variant={data?.viewerLiked ? "primary" : "secondary"}
          fullWidth={false}
          disabled={!canInteract || like.isPending || unlike.isPending}
          onClick={() => (data?.viewerLiked ? unlike.mutate() : like.mutate())}
        >
          ❤️ {data?.viewerLiked ? t("wanted.liked") : t("wanted.like")}
        </Button>
        <Button
          variant={data?.viewerNotified ? "primary" : "secondary"}
          fullWidth={false}
          disabled={!canInteract || notify.isPending || cancelNotify.isPending}
          onClick={() => (data?.viewerNotified ? cancelNotify.mutate() : notify.mutate())}
        >
          🔔 {data?.viewerNotified ? t("wanted.notifying") : t("wanted.notifyMe")}
        </Button>
      </div>

      {!isAuthed && <p className="text-xs text-neutral-500">{t("wanted.signInHint")}</p>}
    </div>
  );
}

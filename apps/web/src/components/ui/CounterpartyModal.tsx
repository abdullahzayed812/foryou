import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";

/** A lightweight "who am I dealing with" glance — name, role, and how long
 * they've been on the platform. Not a full public profile page (none exists
 * yet): the data is whatever the offer/import-request response already
 * carries, so this never triggers an extra lookup of its own. */
export function CounterpartyModal({
  name,
  role,
  memberSince,
  onClose,
}: {
  name: string;
  role: "customer" | "seller";
  memberSince: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Modal title={name} onClose={onClose}>
      <div className="flex flex-col gap-2">
        <Badge tone="brand">{t(`roles.${role}`)}</Badge>
        <p className="text-sm text-neutral-600">
          {t("counterpartyModal.memberSince", {
            date: new Date(memberSince).toLocaleDateString(),
          })}
        </p>
      </div>
    </Modal>
  );
}

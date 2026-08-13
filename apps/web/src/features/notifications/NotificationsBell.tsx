import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useNotifications, useUnreadCount, useMarkNotificationRead } from "./hooks";
import type { Notification } from "./types";
import { BellIcon } from "@/components/ui/icons";

export function NotificationsBell() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: unread } = useUnreadCount();
  const { data: notifications } = useNotifications();
  const markRead = useMarkNotificationRead();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const recent = notifications?.slice(0, 8) ?? [];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={t("notifications.bell.label")}
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900"
      >
        <BellIcon className="h-5 w-5" />
        {Boolean(unread?.count) && (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread!.count > 9 ? "9+" : unread!.count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 z-20 mt-2 w-80 rounded-2xl border border-neutral-200/70 bg-white shadow-lifted">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <span className="font-display text-sm font-semibold text-neutral-900">
              {t("notifications.bell.title")}
            </span>
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-brand-700 hover:underline"
            >
              {t("notifications.bell.viewAll")}
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-neutral-500">
              {t("notifications.bell.empty")}
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {recent.map((n: Notification) => (
                <li
                  key={n.id}
                  className={`cursor-pointer border-b border-neutral-100 px-4 py-3 text-sm transition-colors duration-150 last:border-0 hover:bg-neutral-50 ${
                    n.readAt ? "" : "bg-brand-50/50"
                  }`}
                  onClick={() => !n.readAt && markRead.mutate(n.id)}
                >
                  <p className="font-medium text-neutral-900">{n.title}</p>
                  <p className="mt-0.5 text-neutral-600">{n.body}</p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

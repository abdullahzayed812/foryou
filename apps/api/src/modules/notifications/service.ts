import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_TYPE_CATEGORY,
  type NotificationPreferences,
  type UpdateNotificationPreferencesInput,
} from "@foryou/shared";
import { NotFoundError } from "../../lib/http-errors.js";
import { emitToUser } from "../../lib/socket.js";
import {
  notificationsRepository,
  type NotificationsRepository,
  type NotificationRow,
  type NotificationPreferencesRow,
} from "./repository.js";

type NotificationType = NotificationRow["type"];

function toPreferences(row: NotificationPreferencesRow): NotificationPreferences {
  return {
    orders: row.orders,
    offers: row.offers,
    disputes: row.disputes,
    reviews: row.reviews,
    verification: row.verification,
    wallet: row.wallet,
    products: row.products,
  };
}

export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

  /**
   * Persists the notification, then pushes it live to any connected socket
   * for this user (fire-and-forget — the REST list is the durable record).
   * Returns `null` when the user has muted this notification's category;
   * account-security notices ignore preferences and are always delivered.
   */
  async notify(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<NotificationRow | null> {
    const category = NOTIFICATION_TYPE_CATEGORY[type];
    if (category && category !== "account") {
      const prefs = await this.repo.getPreferences(userId);
      if (prefs && !prefs[category]) return null;
    }

    const notification = await this.repo.create({ userId, type, title, body, data });
    emitToUser(userId, "notification:new", notification);
    return notification;
  }

  listMine(userId: string) {
    return this.repo.listForUser(userId);
  }

  unreadCount(userId: string) {
    return this.repo.unreadCount(userId);
  }

  async markRead(userId: string, id: string): Promise<NotificationRow> {
    const updated = await this.repo.markRead(id, userId);
    if (!updated) throw new NotFoundError("Notification not found");
    return updated;
  }

  markAllRead(userId: string) {
    return this.repo.markAllRead(userId);
  }

  // ---- preferences ----

  async getMyPreferences(userId: string): Promise<NotificationPreferences> {
    const row = await this.repo.getPreferences(userId);
    return row ? toPreferences(row) : { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }

  async updateMyPreferences(
    userId: string,
    patch: UpdateNotificationPreferencesInput,
  ): Promise<NotificationPreferences> {
    const row = await this.repo.upsertPreferences(userId, patch);
    return toPreferences(row);
  }
}

export const notificationsService = new NotificationsService(notificationsRepository);

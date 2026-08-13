import { NotFoundError } from "../../lib/http-errors.js";
import { emitToUser } from "../../lib/socket.js";
import {
  notificationsRepository,
  type NotificationsRepository,
  type NotificationRow,
} from "./repository.js";

type NotificationType = NotificationRow["type"];

export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

  /** Persists the notification, then pushes it live to any connected socket for this user (fire-and-forget — the REST list is the durable record). */
  async notify(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<NotificationRow> {
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
}

export const notificationsService = new NotificationsService(notificationsRepository);

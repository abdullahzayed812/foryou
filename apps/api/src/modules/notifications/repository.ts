import { eq, and, desc, isNull, count } from "drizzle-orm";
import { db } from "../../db/index.js";
import { notifications } from "./schema.js";

export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export class NotificationsRepository {
  async create(data: NewNotification): Promise<NotificationRow> {
    const [row] = await db.insert(notifications).values(data).returning();
    if (!row) throw new Error("failed to create notification");
    return row;
  }

  listForUser(userId: string, limit = 50) {
    return db.query.notifications.findMany({
      where: eq(notifications.userId, userId),
      orderBy: [desc(notifications.createdAt)],
      limit,
    });
  }

  async unreadCount(userId: string): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return row?.value ?? 0;
  }

  async markRead(id: string, userId: string): Promise<NotificationRow | undefined> {
    const [row] = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return row;
  }

  async markAllRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  }
}

export const notificationsRepository = new NotificationsRepository();

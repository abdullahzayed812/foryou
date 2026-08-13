import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { payments, paymentWebhooksLog } from "./schema.js";

export type PaymentRow = typeof payments.$inferSelect;

export class PaymentsRepository {
  async create(data: typeof payments.$inferInsert): Promise<PaymentRow> {
    const [row] = await db.insert(payments).values(data).returning();
    if (!row) throw new Error("failed to create payment");
    return row;
  }

  findByProviderTransactionId(providerTransactionId: string) {
    return db.query.payments.findFirst({
      where: eq(payments.providerTransactionId, providerTransactionId),
    });
  }

  findByOrderId(orderId: string) {
    return db.query.payments.findMany({ where: eq(payments.orderId, orderId) });
  }

  async setProviderTransactionId(
    id: string,
    providerTransactionId: string,
  ): Promise<PaymentRow | undefined> {
    const [row] = await db
      .update(payments)
      .set({ providerTransactionId, updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning();
    return row;
  }

  async setStatus(id: string, status: PaymentRow["status"]): Promise<PaymentRow | undefined> {
    const [row] = await db
      .update(payments)
      .set({ status, updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning();
    return row;
  }

  /** Idempotency check — has this exact provider transaction already been recorded? */
  async hasProcessedWebhook(providerTransactionId: string): Promise<boolean> {
    const existing = await db.query.paymentWebhooksLog.findFirst({
      where: eq(paymentWebhooksLog.providerTransactionId, providerTransactionId),
    });
    return Boolean(existing);
  }

  async logWebhook(providerTransactionId: string, payload: unknown): Promise<void> {
    await db.insert(paymentWebhooksLog).values({ providerTransactionId, payload });
  }
}

export const paymentsRepository = new PaymentsRepository();

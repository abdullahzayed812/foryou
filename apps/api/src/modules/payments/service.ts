import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
} from "../../lib/http-errors.js";
import { eventBus } from "../../lib/events.js";
import { usersRepository } from "../users/repository.js";
import { ordersRepository } from "../orders/repository.js";
import { ordersService } from "../orders/service.js";
import { paymentsRepository, type PaymentsRepository } from "./repository.js";
import { paymobClient, type WebhookPayload } from "./paymob-client.js";
import "./events.js";

export class PaymentsService {
  constructor(private readonly repo: PaymentsRepository) {}

  async initiate(customerId: string, orderId: string) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError("Order not found");
    if (order.customerId !== customerId) throw new ForbiddenError("This isn't your order");
    if (order.stage !== "awaiting_deposit")
      throw new ConflictError("This order isn't awaiting payment");

    const customer = await usersRepository.findById(customerId);
    if (!customer) throw new UnauthenticatedError();

    const amount = ordersService.getPayableAmount(order);
    const payment = await this.repo.create({
      orderId,
      amount: amount.toFixed(2),
      status: "pending",
    });

    const intention = await paymobClient.createIntention({
      orderId,
      amount,
      customerEmail: customer.email,
      customerName: customer.email,
    });
    await this.repo.setProviderTransactionId(payment.id, intention.providerTransactionId);

    eventBus.publish("payment.initiated", { paymentId: payment.id, orderId });
    return {
      checkoutUrl: intention.checkoutUrl,
      paymentId: payment.id,
      providerTransactionId: intention.providerTransactionId,
    };
  }

  /**
   * BRD Stage 4: "Payment confirmation happens automatically... No manual
   * confirmation is required" — the webhook is the *only* thing that can
   * mark a deposit paid, never a client-reported "I paid" call.
   */
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    const verified = paymobClient.verifyWebhookSignature(payload, payload.hmac);
    if (!verified) throw new ValidationError("Invalid webhook signature");

    const alreadyProcessed = await this.repo.hasProcessedWebhook(payload.transactionId);
    if (alreadyProcessed) return; // idempotent — Paymob may retry the same webhook

    await this.repo.logWebhook(payload.transactionId, payload);

    const payment = await this.repo.findByProviderTransactionId(payload.transactionId);
    if (!payment) throw new NotFoundError("No payment found for this transaction");

    if (!payload.success) {
      await this.repo.setStatus(payment.id, "failed");
      eventBus.publish("payment.failed", { paymentId: payment.id, orderId: payment.orderId });
      return;
    }

    await this.repo.setStatus(payment.id, "succeeded");
    await ordersService.markPaid(payment.orderId);
    eventBus.publish("payment.succeeded", { paymentId: payment.id, orderId: payment.orderId });
  }
}

export const paymentsService = new PaymentsService(paymentsRepository);

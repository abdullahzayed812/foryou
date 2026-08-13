import { randomUUID, createHmac } from "node:crypto";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

export interface CreateIntentionInput {
  orderId: string;
  amount: number; // EGP
  customerEmail: string;
  customerName: string;
}

export interface CreateIntentionResult {
  checkoutUrl: string;
  providerTransactionId: string;
}

export interface WebhookPayload {
  transactionId: string;
  orderId: string;
  amountCents: number;
  success: boolean;
  hmac: string;
}

/**
 * `PAYMOB_MODE=mock` (dev/test default) fully simulates Paymob without real
 * credentials: `createIntention` returns a checkout URL pointing at this
 * app's own `/dev/mock-checkout` page instead of Paymob's, and "completing"
 * it there fires a correctly-HMAC-signed request at the *real* webhook
 * endpoint — so the whole pipeline (signature check, idempotency, order/
 * wallet side effects) runs for real, only the card-entry page is fake.
 *
 * `PAYMOB_MODE=live` is intentionally left unimplemented rather than guessed
 * at: Paymob's Intention API request/response shape and HMAC concatenation
 * order are exact-match requirements, and getting them wrong silently would
 * be worse than refusing to pretend. Wire the real HTTP calls in here against
 * Paymob's docs and a real sandbox account before flipping the env var.
 */
export class PaymobClient {
  async createIntention(input: CreateIntentionInput): Promise<CreateIntentionResult> {
    if (env.PAYMOB_MODE === "live") {
      throw new Error(
        "PAYMOB_MODE=live has no implementation yet — this needs real Paymob sandbox credentials " +
          "to build and verify against. See the class doc comment on PaymobClient.",
      );
    }

    const providerTransactionId = `mock_${randomUUID()}`;
    const checkoutUrl = `${env.APP_URL}/api/v1/dev/mock-checkout/${providerTransactionId}?orderId=${input.orderId}&amount=${input.amount}`;
    logger.info(
      { providerTransactionId, orderId: input.orderId },
      "paymob(mock): intention created",
    );
    return { checkoutUrl, providerTransactionId };
  }

  /** Mirrors the shape of Paymob's real HMAC check — mock mode uses our own scheme since the real one needs live docs to verify against. */
  signWebhookPayload(
    transactionId: string,
    orderId: string,
    amountCents: number,
    success: boolean,
  ): string {
    const canonical = `${transactionId}.${orderId}.${amountCents}.${success}`;
    return createHmac("sha512", env.PAYMOB_HMAC_SECRET).update(canonical).digest("hex");
  }

  verifyWebhookSignature(payload: Omit<WebhookPayload, "hmac">, hmac: string): boolean {
    const expected = this.signWebhookPayload(
      payload.transactionId,
      payload.orderId,
      payload.amountCents,
      payload.success,
    );
    return expected === hmac;
  }
}

export const paymobClient = new PaymobClient();

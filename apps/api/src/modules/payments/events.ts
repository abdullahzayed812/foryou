export interface PaymentInitiatedPayload {
  paymentId: string;
  orderId: string;
}

export interface PaymentSucceededPayload {
  paymentId: string;
  orderId: string;
}

export interface PaymentFailedPayload {
  paymentId: string;
  orderId: string;
}

declare module "../../lib/events.js" {
  interface EventMap {
    "payment.initiated": PaymentInitiatedPayload;
    "payment.succeeded": PaymentSucceededPayload;
    "payment.failed": PaymentFailedPayload;
  }
}

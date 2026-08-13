export interface ImportRequestCreatedPayload {
  importRequestId: string;
  customerId: string;
}

export interface ImportRequestDistributedPayload {
  importRequestId: string;
  matchedSellerIds: string[];
}

export interface ImportRequestClosedPayload {
  importRequestId: string;
  reason: "offer_selected" | "deposit_deadline_exhausted" | "cancelled";
}

declare module "../../lib/events.js" {
  interface EventMap {
    "import_request.created": ImportRequestCreatedPayload;
    "import_request.distributed": ImportRequestDistributedPayload;
    "import_request.closed": ImportRequestClosedPayload;
  }
}

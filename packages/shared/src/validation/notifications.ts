import { z } from "zod";

/**
 * User-facing groupings of the `notification_type` enum. A user can mute a
 * whole category; account-security notices (`account_suspended`,
 * `account_reactivated`) are deliberately **not** a category — they are
 * always delivered.
 */
export const NOTIFICATION_PREFERENCE_CATEGORIES = [
  "orders",
  "offers",
  "disputes",
  "reviews",
  "verification",
  "wallet",
  "products",
] as const;

export type NotificationPreferenceCategory =
  (typeof NOTIFICATION_PREFERENCE_CATEGORIES)[number];

/**
 * Maps every `notification_type` to the category that gates it, or
 * `"account"` for the always-on security notices. Kept beside the category
 * list so the API's delivery check and the settings UI stay in sync.
 */
export const NOTIFICATION_TYPE_CATEGORY: Record<
  string,
  NotificationPreferenceCategory | "account"
> = {
  order_deposit_paid: "orders",
  order_delivered: "orders",
  order_completed: "orders",
  order_cancelled: "orders",
  deposit_deadline_missed: "orders",
  offer_received: "offers",
  offer_selected: "offers",
  offer_rejected: "offers",
  import_request_matched: "offers",
  dispute_opened: "disputes",
  dispute_resolved: "disputes",
  review_received: "reviews",
  verification_approved: "verification",
  verification_rejected: "verification",
  withdrawal_processed: "wallet",
  wallet_balance_released: "wallet",
  product_published: "products",
  product_pending_review: "products",
  product_restocked: "products",
  product_wanted_available: "products",
  account_suspended: "account",
  account_reactivated: "account",
};

export const notificationPreferencesSchema = z.object({
  orders: z.boolean(),
  offers: z.boolean(),
  disputes: z.boolean(),
  reviews: z.boolean(),
  verification: z.boolean(),
  wallet: z.boolean(),
  products: z.boolean(),
});
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export const updateNotificationPreferencesSchema = notificationPreferencesSchema
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one preference must be provided",
  });
export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  orders: true,
  offers: true,
  disputes: true,
  reviews: true,
  verification: true,
  wallet: true,
  products: true,
};

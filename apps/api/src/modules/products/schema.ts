import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  customType,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { users } from "../users/schema.js";
import { categories } from "../categories/schema.js";
import { brands } from "../brands/schema.js";
import { mediaAssets } from "../media/schema.js";

/** Which role-context a Seller+Merchant dual-role account listed this product under (BRD Rule 6). */
export const productOwnerRoleEnum = pgEnum("product_owner_role", ["seller", "merchant"]);

export const productStatusEnum = pgEnum("product_status", [
  "available",
  "low_stock",
  "out_of_stock",
  "coming_soon",
]);

export const productModerationStatusEnum = pgEnum("product_moderation_status", [
  "published",
  "pending_review",
  "rejected",
  "hidden",
]);

// tsvector isn't one of drizzle-orm's built-in pg-core column types yet — a
// thin customType is the documented way to declare it (architecture doc §03
// "GIN index on products.search_vector").
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ownerRole: productOwnerRoleEnum("owner_role").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id),
    name: text("name").notNull(),
    shortDescription: text("short_description").notNull(),
    detailedDescription: text("detailed_description").notNull(),
    countryOfOrigin: text("country_of_origin").notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    shippingCost: numeric("shipping_cost", { precision: 10, scale: 2 }).notNull().default("0"),
    availableQuantity: integer("available_quantity").notNull().default(0),
    status: productStatusEnum("status").notNull().default("coming_soon"),
    warrantyAvailable: boolean("warranty_available").notNull().default(false),
    videoMediaAssetId: uuid("video_media_asset_id").references(() => mediaAssets.id),
    moderationStatus: productModerationStatusEnum("moderation_status")
      .notNull()
      .default("pending_review"),
    rejectionReason: text("rejection_reason"),
    searchVector: tsvector("search_vector"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("products_owner_id_idx").on(table.ownerId),
    index("products_category_id_idx").on(table.categoryId),
    index("products_brand_id_idx").on(table.brandId),
    index("products_status_idx")
      .on(table.status)
      .where(sql`${table.moderationStatus} = 'published'`),
    index("products_search_vector_idx").using("gin", table.searchVector),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    mediaAssetId: uuid("media_asset_id")
      .notNull()
      .references(() => mediaAssets.id),
    position: integer("position").notNull(),
    isCover: boolean("is_cover").notNull().default(false),
    isCountryOfOrigin: boolean("is_country_of_origin").notNull().default(false),
  },
  (table) => [
    uniqueIndex("product_images_product_id_position_unique").on(table.productId, table.position),
    index("product_images_product_id_idx").on(table.productId),
  ],
);

export const productTags = pgTable(
  "product_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (table) => [index("product_tags_tag_idx").on(table.tag, table.productId)],
);

export const stockNotifications = pgTable(
  "stock_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("stock_notifications_product_customer_unique").on(
      table.productId,
      table.customerId,
    ),
  ],
);

export const productsRelations = relations(products, ({ many, one }) => ({
  images: many(productImages),
  tags: many(productTags),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
  mediaAsset: one(mediaAssets, {
    fields: [productImages.mediaAssetId],
    references: [mediaAssets.id],
  }),
}));

export const productTagsRelations = relations(productTags, ({ one }) => ({
  product: one(products, { fields: [productTags.productId], references: [products.id] }),
}));

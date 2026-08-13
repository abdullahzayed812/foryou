import { z } from "zod";
import { countryEnum } from "./countries.js";

// Core per-role profile fields (BRD Rule 1 — Registration Rules). Defined
// once here and used by both the API (registration + "add a role" DTOs) and
// the web app (registration forms) — one schema, never two definitions that
// can drift apart.
//
// These `.optional()` fields are still `.min(1)`/`.url()` on the *value*
// when present — an HTML text input left blank submits `""`, not
// `undefined`, so the web forms that bind these must normalize the empty
// string themselves (react-hook-form's `setValueAs`) rather than relying on
// the schema to treat `""` as "not provided". Changing the schema to accept
// `""` directly would mean a client that *does* send an explicit empty
// string silently gets a different value than one that omits the field.
export const customerProfileFieldsSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  governorate: z.string().min(1),
  city: z.string().min(1),
  mobileNumber: z.string().min(1).optional(),
});

export const sellerProfileFieldsSchema = z.object({
  fullName: z.string().min(1),
  phoneNumber: z.string().min(1),
  importCountries: z.array(countryEnum).min(1),
  productCategories: z.array(z.string().min(1)).min(1),
  facebookPage: z.url().optional(),
  instagramPage: z.url().optional(),
});

export const merchantProfileFieldsSchema = z.object({
  businessName: z.string().min(1),
  ownerName: z.string().min(1),
  phoneNumber: z.string().min(1),
  governorate: z.string().min(1),
  city: z.string().min(1),
  businessCategory: z.string().min(1),
  importCountry: countryEnum,
});

export const updateCustomerProfileSchema = customerProfileFieldsSchema.partial().strict();
export type UpdateCustomerProfileInput = z.infer<typeof updateCustomerProfileSchema>;

export const updateSellerProfileSchema = sellerProfileFieldsSchema.partial().strict();
export type UpdateSellerProfileInput = z.infer<typeof updateSellerProfileSchema>;

export const updateMerchantProfileSchema = merchantProfileFieldsSchema.partial().strict();
export type UpdateMerchantProfileInput = z.infer<typeof updateMerchantProfileSchema>;

/** Adding "seller" or "merchant" to an already-registered account (BRD: one account, multiple roles). */
export const addSellerRoleSchema = sellerProfileFieldsSchema.strict();
export type AddSellerRoleInput = z.infer<typeof addSellerRoleSchema>;

export const addMerchantRoleSchema = merchantProfileFieldsSchema.strict();
export type AddMerchantRoleInput = z.infer<typeof addMerchantRoleSchema>;

export const createAddressSchema = z
  .object({
    label: z.string().min(1).max(50),
    governorate: z.string().min(1),
    city: z.string().min(1),
    addressLine: z.string().min(1).max(300),
    isDefault: z.boolean().optional().default(false),
  })
  .strict();
export type CreateAddressInput = z.infer<typeof createAddressSchema>;

export const updateAddressSchema = createAddressSchema.partial().strict();
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;

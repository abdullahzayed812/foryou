// Validation lives in @foryou/shared so the API and the web app validate
// against the exact same Zod schemas — see architecture doc §10 "Forms".
export {
  updateCustomerProfileSchema,
  type UpdateCustomerProfileInput,
  updateSellerProfileSchema,
  type UpdateSellerProfileInput,
  updateMerchantProfileSchema,
  type UpdateMerchantProfileInput,
  addSellerRoleSchema,
  type AddSellerRoleInput,
  addMerchantRoleSchema,
  type AddMerchantRoleInput,
  createAddressSchema,
  type CreateAddressInput,
  updateAddressSchema,
  type UpdateAddressInput,
} from "@foryou/shared";

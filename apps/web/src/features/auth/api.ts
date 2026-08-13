import { apiClient } from "@/lib/api-client";
import type {
  RegisterCustomerInput,
  RegisterSellerInput,
  RegisterMerchantInput,
  VerifyOtpInput,
  ResendOtpInput,
  LoginInput,
  ChangePasswordInput,
  UpdateCustomerProfileInput,
  UpdateSellerProfileInput,
  UpdateMerchantProfileInput,
  CreateAddressInput,
  UpdateAddressInput,
  CountryCode,
} from "@foryou/shared";

interface TokenResponse {
  accessToken: string;
}

interface RegisterResponse {
  userId: string;
  email: string;
}

export const authApi = {
  registerCustomer: (input: RegisterCustomerInput) =>
    apiClient.post<RegisterResponse>("/auth/register/customer", input).then((r) => r.data),

  registerSeller: (input: RegisterSellerInput) =>
    apiClient.post<RegisterResponse>("/auth/register/seller", input).then((r) => r.data),

  registerMerchant: (input: RegisterMerchantInput) =>
    apiClient.post<RegisterResponse>("/auth/register/merchant", input).then((r) => r.data),

  verifyOtp: (input: VerifyOtpInput) =>
    apiClient.post<TokenResponse>("/auth/otp/verify", input).then((r) => r.data),

  resendOtp: (input: ResendOtpInput) =>
    apiClient.post("/auth/otp/resend", input).then((r) => r.data),

  login: (input: LoginInput) =>
    apiClient.post<TokenResponse>("/auth/login", input).then((r) => r.data),

  logout: () => apiClient.post("/auth/logout").then((r) => r.data),

  changePassword: (input: ChangePasswordInput) =>
    apiClient.post("/auth/password/change", input).then((r) => r.data),
};

export interface Address {
  id: string;
  label: string;
  governorate: string;
  city: string;
  addressLine: string;
  isDefault: boolean;
}

export interface MeResponse {
  id: string;
  email: string;
  status: "active" | "suspended" | "banned";
  emailVerifiedAt: string | null;
  createdAt: string;
  roles: ("customer" | "seller" | "merchant" | "admin")[];
  customerProfile: {
    firstName: string;
    lastName: string;
    governorate: string;
    city: string;
    mobileNumber: string | null;
  } | null;
  sellerProfile: {
    fullName: string;
    phoneNumber: string;
    importCountries: CountryCode[];
    productCategories: string[];
    facebookPage: string | null;
    instagramPage: string | null;
  } | null;
  merchantProfile: {
    businessName: string;
    ownerName: string;
    phoneNumber: string;
    governorate: string;
    city: string;
    businessCategory: string;
    importCountry: CountryCode;
  } | null;
  addresses: Address[];
}

export const usersApi = {
  me: () => apiClient.get<MeResponse>("/users/me").then((r) => r.data),

  updateCustomerProfile: (input: UpdateCustomerProfileInput) =>
    apiClient.patch("/users/me/customer-profile", input).then((r) => r.data),

  updateSellerProfile: (input: UpdateSellerProfileInput) =>
    apiClient.patch("/users/me/seller-profile", input).then((r) => r.data),

  updateMerchantProfile: (input: UpdateMerchantProfileInput) =>
    apiClient.patch("/users/me/merchant-profile", input).then((r) => r.data),

  listAddresses: () => apiClient.get<Address[]>("/users/me/addresses").then((r) => r.data),

  createAddress: (input: CreateAddressInput) =>
    apiClient.post<Address>("/users/me/addresses", input).then((r) => r.data),

  updateAddress: (id: string, input: UpdateAddressInput) =>
    apiClient.patch<Address>(`/users/me/addresses/${id}`, input).then((r) => r.data),

  deleteAddress: (id: string) => apiClient.delete(`/users/me/addresses/${id}`).then((r) => r.data),
};

export interface TrustBadge {
  level: "excellent" | "good" | "average" | "low";
}

export const trustApi = {
  me: () => apiClient.get<TrustBadge>("/users/me/trust").then((r) => r.data),
};

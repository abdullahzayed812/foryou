import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateAddressInput } from "@foryou/shared";
import { authApi, usersApi, trustApi } from "./api";
import { useAuthStore } from "./store";
import { useActiveRoleStore } from "./active-role-store";

export const meQueryKey = ["me"] as const;
const addressesQueryKey = ["me", "addresses"] as const;

export function useMe() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: meQueryKey,
    queryFn: usersApi.me,
    enabled: status === "authenticated",
    staleTime: 60_000,
  });
}

function useInvalidateMe() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: meQueryKey });
}

export function useUpdateCustomerProfile() {
  const invalidateMe = useInvalidateMe();
  return useMutation({
    mutationFn: usersApi.updateCustomerProfile,
    onSuccess: invalidateMe,
  });
}

export function useUpdateSellerProfile() {
  const invalidateMe = useInvalidateMe();
  return useMutation({
    mutationFn: usersApi.updateSellerProfile,
    onSuccess: invalidateMe,
  });
}

export function useUpdateMerchantProfile() {
  const invalidateMe = useInvalidateMe();
  return useMutation({
    mutationFn: usersApi.updateMerchantProfile,
    onSuccess: invalidateMe,
  });
}

export function useChangePassword() {
  return useMutation({ mutationFn: authApi.changePassword });
}

export function useAddresses() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: addressesQueryKey,
    queryFn: usersApi.listAddresses,
    enabled: status === "authenticated",
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usersApi.createAddress,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: addressesQueryKey }),
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & UpdateAddressInput) =>
      usersApi.updateAddress(id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: addressesQueryKey }),
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usersApi.deleteAddress,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: addressesQueryKey }),
  });
}

export function useMyTrustBadge() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: ["me", "trust"],
    queryFn: trustApi.me,
    enabled: status === "authenticated",
    staleTime: 60_000,
  });
}

export function useRegisterCustomer() {
  return useMutation({ mutationFn: authApi.registerCustomer });
}

export function useRegisterSeller() {
  return useMutation({ mutationFn: authApi.registerSeller });
}

export function useRegisterMerchant() {
  return useMutation({ mutationFn: authApi.registerMerchant });
}

export function useVerifyOtp() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const resetActiveRole = useActiveRoleStore((s) => s.resetActiveRole);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: (data) => {
      resetActiveRole();
      setAccessToken(data.accessToken);
      void queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
  });
}

export function useResendOtp() {
  return useMutation({ mutationFn: authApi.resendOtp });
}

export function useLogin() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const resetActiveRole = useActiveRoleStore((s) => s.resetActiveRole);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      resetActiveRole();
      setAccessToken(data.accessToken);
      void queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
  });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  const resetActiveRole = useActiveRoleStore((s) => s.resetActiveRole);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clear();
      resetActiveRole();
      queryClient.clear();
    },
  });
}

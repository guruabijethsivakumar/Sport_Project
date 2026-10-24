import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { queryKeys } from '../query-keys.js';
import type { ApiClient } from '../../client/api-client.js';

export function useLogin(client: ApiClient, options?: UseMutationOptions<any, Error, any>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => client.post('/auth/login', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
    },
    ...options,
  });
}

export function useRegister(client: ApiClient, options?: UseMutationOptions<any, Error, any>) {
  return useMutation({
    mutationFn: (body: any) => client.post('/auth/register', body),
    ...options,
  });
}

export function useLogout(client: ApiClient, options?: UseMutationOptions<any, Error, void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => client.post('/auth/logout', {}),
    onSuccess: () => {
      client.getAdapter().clearSession();
      queryClient.clear();
    },
    ...options,
  });
}

export function useForgotPassword(
  client: ApiClient,
  options?: UseMutationOptions<any, Error, { email: string }>,
) {
  return useMutation({
    mutationFn: (body: { email: string }) => client.post('/auth/forgot-password', body),
    ...options,
  });
}

export function useResetPassword(
  client: ApiClient,
  options?: UseMutationOptions<any, Error, { token: string; newPassword: string }>,
) {
  return useMutation({
    mutationFn: (body: { token: string; newPassword: string }) =>
      client.post('/auth/reset-password', body),
    ...options,
  });
}

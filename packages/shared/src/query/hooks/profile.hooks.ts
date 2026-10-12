import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { queryKeys } from '../query-keys.js';
import type { ApiClient } from '../../client/api-client.js';

export function useMyProfile(client: ApiClient, options?: Partial<UseQueryOptions<any, Error>>) {
  return useQuery({
    queryKey: queryKeys.profile.me(),
    queryFn: () => client.get('/profile/me'),
    ...options,
  });
}

export function useUpdateProfile(client: ApiClient, options?: UseMutationOptions<any, Error, any>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => client.patch('/profile/me', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me() });
    },
    ...options,
  });
}

export function useOnboardingStatus(client: ApiClient, options?: Partial<UseQueryOptions<any, Error>>) {
  return useQuery({
    queryKey: queryKeys.profile.onboardingStatus(),
    queryFn: () => client.get('/profile/me/onboarding'),
    ...options,
  });
}

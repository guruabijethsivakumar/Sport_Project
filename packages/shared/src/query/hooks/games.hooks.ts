import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { queryKeys } from '../query-keys.js';
import { invalidateAfterGameJoin, invalidateAfterGameLeave } from '../utils/invalidation.js';
import type { ApiClient } from '../../client/api-client.js';

export function useMyGames(client: ApiClient, options?: Partial<UseQueryOptions<any, Error>>) {
  const pollingInterval = client.getConfig().pollingIntervalMs;
  return useQuery({
    queryKey: queryKeys.games.my(),
    queryFn: () => client.get('/games/me'),
    refetchInterval: pollingInterval,
    ...options,
  });
}

export function useGameDetail(client: ApiClient, gameId: string, options?: Partial<UseQueryOptions<any, Error>>) {
  const pollingInterval = client.getConfig().pollingIntervalMs;
  return useQuery({
    queryKey: queryKeys.games.detail(gameId),
    queryFn: () => client.get(`/games/${gameId}`),
    enabled: Boolean(gameId),
    refetchInterval: pollingInterval,
    ...options,
  });
}

export function useGameRoster(client: ApiClient, gameId: string, options?: Partial<UseQueryOptions<any, Error>>) {
  const pollingInterval = client.getConfig().pollingIntervalMs;
  return useQuery({
    queryKey: queryKeys.games.roster(gameId),
    queryFn: () => client.get(`/games/${gameId}/roster`),
    enabled: Boolean(gameId),
    refetchInterval: pollingInterval,
    ...options,
  });
}

export function useCreateGame(client: ApiClient, options?: UseMutationOptions<any, Error, any>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => client.post('/games', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.games.my() });
      queryClient.invalidateQueries({ queryKey: queryKeys.discovery.all });
    },
    ...options,
  });
}

export function useJoinGame(client: ApiClient, gameId: string, options?: UseMutationOptions<any, Error, void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => client.post(`/games/${gameId}/join`, {}),
    onSuccess: async () => {
      await invalidateAfterGameJoin(queryClient, gameId);
    },
    ...options,
  });
}

export function useLeaveGame(client: ApiClient, gameId: string, options?: UseMutationOptions<any, Error, void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => client.post(`/games/${gameId}/leave`, {}),
    onSuccess: async () => {
      await invalidateAfterGameLeave(queryClient, gameId);
    },
    ...options,
  });
}

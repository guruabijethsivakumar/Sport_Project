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
  const pollingInterval = client?.getConfig?.()?.pollingIntervalMs;
  return useQuery({
    queryKey: queryKeys.games.my(),
    queryFn: () => client.get('/games/me'),
    refetchInterval: pollingInterval,
    ...options,
  });
}

export function useGameDetail(
  client: ApiClient,
  gameId: string,
  options?: Partial<UseQueryOptions<any, Error>>,
  inviteCode?: string,
) {
  const pollingInterval = client?.getConfig?.()?.pollingIntervalMs;
  const url = inviteCode
    ? `/games/${gameId}?code=${encodeURIComponent(inviteCode)}`
    : `/games/${gameId}`;
  return useQuery({
    queryKey: [...queryKeys.games.detail(gameId), inviteCode || ''],
    queryFn: () => client.get(url),
    enabled: Boolean(gameId),
    refetchInterval: pollingInterval,
    ...options,
  });
}

export function useGameRoster(client: ApiClient, gameId: string, options?: Partial<UseQueryOptions<any, Error>>) {
  const pollingInterval = client?.getConfig?.()?.pollingIntervalMs;
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

export function useGameEligibility(client: ApiClient, gameId: string, options?: Partial<UseQueryOptions<any, Error>>) {
  return useQuery({
    queryKey: queryKeys.games.eligibility(gameId),
    queryFn: () => client.get(`/games/${gameId}/eligibility`),
    enabled: Boolean(gameId),
    ...options,
  });
}

export function useCancelGame(
  client: ApiClient,
  gameId: string,
  options?: UseMutationOptions<any, Error, { reasonCode: string; reasonText?: string }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { reasonCode: string; reasonText?: string }) =>
      client.post(`/games/${gameId}/cancel`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.games.detail(gameId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.games.roster(gameId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.games.my() });
      queryClient.invalidateQueries({ queryKey: queryKeys.discovery.all });
    },
    ...options,
  });
}

export function useApproveParticipant(
  client: ApiClient,
  gameId: string,
  options?: UseMutationOptions<any, Error, string>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      client.post(`/games/${gameId}/participants/${userId}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.games.detail(gameId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.games.roster(gameId) });
    },
    ...options,
  });
}

export function useDeclineParticipant(
  client: ApiClient,
  gameId: string,
  options?: UseMutationOptions<any, Error, string>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      client.post(`/games/${gameId}/participants/${userId}/decline`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.games.detail(gameId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.games.roster(gameId) });
    },
    ...options,
  });
}

export function useRemoveParticipant(
  client: ApiClient,
  gameId: string,
  options?: UseMutationOptions<any, Error, { userId: string; reason?: string }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      client.delete(`/games/${gameId}/participants/${userId}`, {
        body: reason ? JSON.stringify({ reason }) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.games.detail(gameId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.games.roster(gameId) });
    },
    ...options,
  });
}

export function useGameByInviteCode(
  client: ApiClient,
  code: string,
  options?: Partial<UseQueryOptions<any, Error>>
) {
  return useQuery({
    queryKey: ['games', 'inviteCode', code],
    queryFn: () => client.get(`/games/code/${code}`),
    enabled: Boolean(code && code.trim().length > 0),
    ...options,
  });
}

export function useUpdateGame(
  client: ApiClient,
  gameId: string,
  options?: UseMutationOptions<any, Error, any>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => client.patch(`/games/${gameId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.games.detail(gameId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.games.my() });
      queryClient.invalidateQueries({ queryKey: queryKeys.discovery.all });
    },
    ...options,
  });
}

export function useGameFeedback(
  client: ApiClient,
  gameId: string,
  options?: Partial<UseQueryOptions<any, Error>>
) {
  return useQuery({
    queryKey: ['games', gameId, 'feedback'],
    queryFn: () => client.get(`/games/${gameId}/feedback`),
    enabled: Boolean(gameId),
    ...options,
  });
}

export interface SubmitFeedbackPayload {
  targetUserId: string;
  attendance: 'attended' | 'no_show';
  note?: string;
}

export function useSubmitGameFeedback(
  client: ApiClient,
  gameId: string,
  options?: UseMutationOptions<any, Error, SubmitFeedbackPayload>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SubmitFeedbackPayload) =>
      client.post(`/games/${gameId}/feedback`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games', gameId, 'feedback'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.games.detail(gameId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.features.all });
    },
    ...options,
  });
}



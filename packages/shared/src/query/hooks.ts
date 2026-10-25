import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { queryKeys } from './query-keys.js';
import { invalidateAfterGameJoin, invalidateAfterGameLeave } from './utils/invalidation.js';
import type { ApiClient } from '../client/api-client.js';

// 1. Keep your teammate's refactored hooks
export * from './hooks/index.js';

// 2. Keep your new Developer 3 specific hooks
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

export function useRegenerateTeams(
  client: ApiClient,
  gameId: string,
  options?: UseMutationOptions<any, Error, void>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => client.post(`/games/${gameId}/teams/generate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.features.teamSuggestion(gameId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.games.roster(gameId) });
    },
    ...options,
  });
}

export interface SubmitResultPayload {
  scores: Array<{ sideKey: string; score: number; winner: boolean }>;
  notes?: string;
}

export interface DisputeResultPayload {
  reason?: string;
}

export function useSubmitResult(
  client: ApiClient,
  gameId: string,
  options?: UseMutationOptions<any, Error, SubmitResultPayload>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SubmitResultPayload) =>
      client.post(`/games/${gameId}/results`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.features.gameResult(gameId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.games.detail(gameId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.games.my() });
      queryClient.invalidateQueries({ queryKey: queryKeys.discovery.all });
    },
    ...options,
  });
}

export function useVerifyResult(
  client: ApiClient,
  gameId: string,
  options?: UseMutationOptions<any, Error, void>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      client.post(`/games/${gameId}/results/verify`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.features.gameResult(gameId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.games.detail(gameId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.games.my() });
      queryClient.invalidateQueries({ queryKey: queryKeys.ratings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.features.all });
    },
    ...options,
  });
}

export function useDisputeResult(
  client: ApiClient,
  gameId: string,
  options?: UseMutationOptions<any, Error, DisputeResultPayload>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DisputeResultPayload) =>
      client.post(`/games/${gameId}/results/dispute`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.features.gameResult(gameId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.games.detail(gameId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.games.my() });
      queryClient.invalidateQueries({ queryKey: queryKeys.features.notifications() });
    },
    ...options,
  });
}

export function useMarkNotificationAsRead(
  client: ApiClient,
  options?: UseMutationOptions<any, Error, string>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => client.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.features.notifications() });
    },
    ...options,
  });
}

export function useMarkAllNotificationsAsRead(
  client: ApiClient,
  options?: UseMutationOptions<any, Error, void>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => client.patch('/notifications/read-all', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.features.notifications() });
    },
    ...options,
  });
}

export function useClearNotification(
  client: ApiClient,
  options?: UseMutationOptions<any, Error, string>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => client.delete(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.features.notifications() });
    },
    ...options,
  });
}

export function useClearAllNotifications(
  client: ApiClient,
  options?: UseMutationOptions<any, Error, void>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => client.delete('/notifications/clear-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.features.notifications() });
    },
    ...options,
  });
}


export interface AdminResolveDisputePayload {
  action?: 'accept_proposal' | 'override_scores' | 'void_match';
  scores?: Array<{ sideKey: string; score: number; winner: boolean }>;
  notes?: string;
}

export function useAdminResolveDispute(
  client: ApiClient,
  gameId: string,
  options?: UseMutationOptions<any, Error, AdminResolveDisputePayload | void>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body?: AdminResolveDisputePayload | void) =>
      client.post(`/admin/disputes/${gameId}/resolve`, body || {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.features.gameResult(gameId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.games.detail(gameId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.features.notifications() });
      queryClient.invalidateQueries({ queryKey: queryKeys.ratings.all });
    },
    ...options,
  });
}

export function useAdminVoidDispute(
  client: ApiClient,
  gameId: string,
  options?: UseMutationOptions<any, Error, { reason?: string } | void>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body?: { reason?: string } | void) =>
      client.post(`/admin/disputes/${gameId}/void`, body || {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.features.gameResult(gameId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.games.detail(gameId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.features.notifications() });
    },
    ...options,
  });
}


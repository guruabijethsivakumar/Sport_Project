import { useQuery, useMutation, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';
import { queryKeys } from './query-keys.js';
import type { ApiClient } from '../client/api-client.js';
import {
  getMockRecommendations,
  getLiveRecommendations,
  type RecommendationsResponse,
} from '../features/recommendations/index.js';
import {
  getMockTeamSuggestion,
  getLiveTeamSuggestion,
  type TeamSuggestionResponse,
} from '../features/teams/index.js';
import {
  getMockGameResult,
  getLiveGameResult,
  type GameResultResponse,
} from '../features/results/index.js';
import {
  getMockNotifications,
  getLiveNotifications,
  type NotificationsListResponse,
} from '../features/notifications/index.js';
import {
  getMockReliability,
  getLiveReliability,
  type ProfileReliabilityResponse,
} from '../features/reliability/index.js';

export function useFeatureRecommendations(
  client: ApiClient,
  options?: Partial<UseQueryOptions<RecommendationsResponse, Error>>,
) {
  const mode = client.getConfig().features?.recommendationsMode || 'mock';
  const isMock = mode === 'mock';

  const query = useQuery({
    queryKey: queryKeys.features.recommendations(),
    queryFn: () => (isMock ? getMockRecommendations() : getLiveRecommendations(client)),
    ...options,
  });

  return { ...query, isMock };
}

export function useFeatureTeamSuggestion(
  client: ApiClient,
  gameId: string,
  options?: Partial<UseQueryOptions<TeamSuggestionResponse | null, Error>>,
) {
  const mode = client.getConfig().features?.teamsMode || 'mock';
  const isMock = mode === 'mock';

  const query = useQuery({
    queryKey: queryKeys.features.teamSuggestion(gameId),
    queryFn: () => (isMock ? getMockTeamSuggestion(gameId) : getLiveTeamSuggestion(client, gameId)),
    enabled: Boolean(gameId),
    ...options,
  });

  return { ...query, isMock };
}

export function useFeatureGameResult(
  client: ApiClient,
  gameId: string,
  options?: Partial<UseQueryOptions<GameResultResponse, Error>>,
) {
  const mode = client.getConfig().features?.resultsMode || 'mock';
  const isMock = mode === 'mock';

  const query = useQuery({
    queryKey: queryKeys.features.gameResult(gameId),
    queryFn: () => (isMock ? getMockGameResult(gameId) : getLiveGameResult(client, gameId)),
    enabled: Boolean(gameId),
    ...options,
  });

  return { ...query, isMock };
}

export function useFeatureNotifications(
  client: ApiClient,
  options?: Partial<UseQueryOptions<NotificationsListResponse, Error>>,
) {
  const mode = client.getConfig().features?.notificationsMode || 'mock';
  const isMock = mode === 'mock';

  const query = useQuery({
    queryKey: queryKeys.features.notifications(),
    queryFn: () => (isMock ? getMockNotifications() : getLiveNotifications(client)),
    ...options,
  });

  return { ...query, isMock };
}

/** Convenience alias for useFeatureNotifications */
export const useNotifications = useFeatureNotifications;


export function useFeatureReliability(
  client: ApiClient,
  userId: string = 'me',
  options?: Partial<UseQueryOptions<ProfileReliabilityResponse, Error>>,
) {
  const mode = client.getConfig().features?.reliabilityMode || 'mock';
  const isMock = mode === 'mock';

  const query = useQuery({
    queryKey: queryKeys.features.reliability(userId),
    queryFn: () => (isMock ? getMockReliability(userId) : getLiveReliability(client, userId)),
    enabled: Boolean(userId),
    ...options,
  });

  return { ...query, isMock };
}

/** Convenience alias for useFeatureReliability with 'me' */
export function useMyReliability(
  client: ApiClient,
  options?: Partial<UseQueryOptions<ProfileReliabilityResponse, Error>>,
) {
  return useFeatureReliability(client, 'me', options);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sprint 1: Explainability, Timeline, and Rating Preview Hooks
// ─────────────────────────────────────────────────────────────────────────────

export interface UnifiedExplanationFactor {
  name: string;
  value: number;
  weight?: number;
  impact?: 'positive' | 'negative' | 'neutral' | string;
  description?: string;
}

export interface UnifiedExplanationResponse {
  subjectId: string;
  type: string;
  summary: string;
  reasons: string[];
  factors: UnifiedExplanationFactor[];
  metrics: Record<string, any>;
  codes?: string[];
}

export type UnifiedExplanation = UnifiedExplanationResponse;

/**
 * Explains why the caller is or is not eligible to join a specific game.
 * Calls GET /api/v1/explain/games/:id/eligibility
 */
export function useExplainEligibility(
  client: ApiClient,
  gameId: string,
  options?: Partial<UseQueryOptions<UnifiedExplanationResponse, Error>>,
) {
  return useQuery({
    queryKey: [...queryKeys.features.all, 'explain', 'eligibility', gameId],
    queryFn: async () => {
      const res = await client.get(`/explain/games/${gameId}/eligibility`);
      return (res as any)?.data || res;
    },
    enabled: Boolean(gameId),
    ...options,
  });
}

/**
 * Explains how teams were formed and balanced for a match.
 * Calls GET /api/v1/explain/games/:id/teams
 */
export function useExplainTeams(
  client: ApiClient,
  gameId: string,
  options?: Partial<UseQueryOptions<UnifiedExplanationResponse, Error>>,
) {
  return useQuery({
    queryKey: [...queryKeys.features.all, 'explain', 'teams', gameId],
    queryFn: async () => {
      const res = await client.get(`/explain/games/${gameId}/teams`);
      return (res as any)?.data || res;
    },
    enabled: Boolean(gameId),
    ...options,
  });
}

/**
 * Explains a player's Elo delta and mathematical calculation from a rating event.
 * Calls GET /api/v1/explain/ratings/:eventId
 */
export function useExplainRating(
  client: ApiClient,
  eventId: string,
  options?: Partial<UseQueryOptions<UnifiedExplanationResponse, Error>>,
) {
  return useQuery({
    queryKey: [...queryKeys.features.all, 'explain', 'rating', eventId],
    queryFn: async () => {
      const res = await client.get(`/explain/ratings/${eventId}`);
      return (res as any)?.data || res;
    },
    enabled: Boolean(eventId),
    ...options,
  });
}

/**
 * Explains why a specific game was recommended to the player.
 * Calls GET /api/v1/explain/recommendations/:gameId
 */
export function useExplainRecommendation(
  client: ApiClient,
  gameId: string,
  options?: Partial<UseQueryOptions<UnifiedExplanationResponse, Error>>,
) {
  return useQuery({
    queryKey: [...queryKeys.features.all, 'explain', 'recommendation', gameId],
    queryFn: async () => {
      const res = await client.get(`/explain/recommendations/${gameId}`);
      return (res as any)?.data || res;
    },
    enabled: Boolean(gameId),
    ...options,
  });
}

export interface DecisionLogItem {
  id?: string;
  _id?: string;
  decisionType: string;
  subjectId: string;
  summary: string;
  reasons: string[];
  factors: UnifiedExplanationFactor[];
  metrics: Record<string, any>;
  createdAt: string;
}

export interface DecisionLogsListResponse {
  decisions: DecisionLogItem[];
  total: number;
  page?: number;
  limit?: number;
}

/**
 * Retrieves the audit trail of decisions made for the caller.
 * Calls GET /api/v1/explain/decisions
 */
export function useDecisionLogs(
  client: ApiClient,
  queryParams?: { decisionType?: string; limit?: number; page?: number },
  options?: Partial<UseQueryOptions<DecisionLogsListResponse, Error>>,
) {
  return useQuery({
    queryKey: [...queryKeys.features.all, 'explain', 'decisions', queryParams || {}],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (queryParams?.decisionType) search.set('decisionType', queryParams.decisionType);
      if (queryParams?.limit) search.set('limit', String(queryParams.limit));
      if (queryParams?.page) search.set('page', String(queryParams.page));
      const qs = search.toString();
      const res = await client.get(`/explain/decisions${qs ? `?${qs}` : ''}`);
      return (res as any)?.data || res;
    },
    ...options,
  });
}

export interface GameTimelineEvent {
  id?: string;
  _id?: string;
  gameId: string;
  type: string;
  actorId?: string | null;
  payload?: Record<string, any>;
  createdAt: string;
}

/**
 * Retrieves the chronological audit timeline of events for a match.
 * Calls GET /api/v1/games/:id/timeline
 */
export function useGameTimeline(
  client: ApiClient,
  gameId: string,
  options?: Partial<UseQueryOptions<GameTimelineEvent[], Error>>,
) {
  return useQuery({
    queryKey: [...queryKeys.games.all, 'timeline', gameId],
    queryFn: async () => {
      const res = await client.get(`/games/${gameId}/timeline`);
      const data = (res as any)?.data || res;
      return Array.isArray(data) ? data : (data as any)?.events || [];
    },
    enabled: Boolean(gameId),
    ...options,
  });
}

export interface PreviewMatchSide {
  sideKey: string;
  playerIds: string[];
}

export interface PreviewMatchPayload {
  sportKey: string;
  sides: [PreviewMatchSide, PreviewMatchSide] | PreviewMatchSide[];
}

export interface MatchPreviewResponse {
  sportKey: string;
  sideA: {
    sideKey: string;
    teamRating: number;
    winProbabilityPercent: number;
  };
  sideB: {
    sideKey: string;
    teamRating: number;
    winProbabilityPercent: number;
  };
  callerHypotheticalDeltas?: {
    win: number;
    draw: number;
    loss: number;
  };
}

/**
 * Mutation hook to calculate prospective win probabilities and rating adjustments.
 * Calls POST /api/v1/ratings/preview
 */
export function usePreviewMatchRatings(
  client: ApiClient,
  options?: Partial<UseMutationOptions<MatchPreviewResponse, Error, PreviewMatchPayload>>,
) {
  return useMutation({
    mutationFn: async (payload: PreviewMatchPayload) => {
      const res = await client.post('/ratings/preview', payload);
      return (res as any)?.data || res;
    },
    ...options,
  });
}

/**
 * Automatic query hook to compute prospective match stakes when sides/players are known.
 * Calls POST /api/v1/ratings/preview
 */
export function useMatchRatingPreview(
  client: ApiClient,
  payload?: PreviewMatchPayload | null,
  options?: Partial<UseQueryOptions<MatchPreviewResponse, Error>>,
) {
  const isEnabled = Boolean(
    payload &&
      payload.sportKey &&
      payload.sides?.length === 2 &&
      payload.sides[0]?.playerIds?.length > 0 &&
      payload.sides[1]?.playerIds?.length > 0,
  );

  return useQuery({
    queryKey: [...queryKeys.ratings.all, 'preview', payload?.sportKey, payload?.sides],
    queryFn: async () => {
      const res = await client.post('/ratings/preview', payload);
      return (res as any)?.data || res;
    },
    enabled: isEnabled,
    staleTime: 60 * 1000,
    ...options,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sprint 2: Admin Dashboard, Venue Moderation, and Sport Catalog Hooks
// ─────────────────────────────────────────────────────────────────────────────

// ── Admin Dashboard Stats ────────────────────────────────────────────────────

export interface AdminDashboardStats {
  users: { total: number; active: number; suspended: number };
  games: {
    total: number;
    open: number;
    confirmed: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
  venues: {
    total: number;
    pendingApproval: number;
    active: number;
    suspended: number;
  };
  disputes: { open: number };
}

/**
 * Fetches platform-wide aggregated metrics for the admin dashboard.
 * Calls GET /api/v1/admin/dashboard/stats
 */
export function useAdminDashboardStats(
  client: ApiClient,
  options?: Partial<UseQueryOptions<AdminDashboardStats, Error>>,
) {
  return useQuery({
    queryKey: queryKeys.admin.stats(),
    queryFn: async () => {
      const res = await client.get('/admin/dashboard/stats');
      return (res as any)?.data || res;
    },
    staleTime: 30 * 1000,
    ...options,
  });
}

// ── Admin Disputes ───────────────────────────────────────────────────────────

export interface AdminDispute {
  _id?: string;
  id?: string;
  gameId: string;
  status: string;
  proposal: {
    proposedByUserId: string;
    scores: Array<{ sideKey: string; score: number }>;
    notes?: string;
  };
  disputedByUserId?: string;
  disputeReason?: string;
  disputedAt?: string;
  createdAt: string;
}

export interface AdminDisputesListResponse {
  disputes: AdminDispute[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Retrieves all disputed match results platform-wide.
 * Calls GET /api/v1/admin/disputes
 */
export function useAdminDisputes(
  client: ApiClient,
  queryParams?: { page?: number; limit?: number },
  options?: Partial<UseQueryOptions<AdminDisputesListResponse, Error>>,
) {
  return useQuery({
    queryKey: queryKeys.admin.disputes(queryParams),
    queryFn: async () => {
      const search = new URLSearchParams();
      if (queryParams?.page) search.set('page', String(queryParams.page));
      if (queryParams?.limit) search.set('limit', String(queryParams.limit));
      const qs = search.toString();
      const res = await client.get(`/admin/disputes${qs ? `?${qs}` : ''}`);
      return (res as any)?.data || res;
    },
    ...options,
  });
}

// ── Venue Moderation ─────────────────────────────────────────────────────────

/**
 * Fetches all venues (for admin moderation table).
 * Calls GET /api/v1/venues (discovery endpoint, returns all statuses for admin).
 */
export function useAdminAllVenues(
  client: ApiClient,
  queryParams?: { status?: string },
  options?: Partial<UseQueryOptions<any, Error>>,
) {
  return useQuery({
    queryKey: queryKeys.admin.venuesAll(queryParams),
    queryFn: async () => {
      const search = new URLSearchParams();
      if (queryParams?.status) search.set('status', queryParams.status);
      const qs = search.toString();
      const res = await client.get(`/venues${qs ? `?${qs}` : ''}`);
      return (res as any)?.data || res;
    },
    ...options,
  });
}

/**
 * Mutation to approve a pending venue.
 * Calls POST /api/v1/venues/:id/approve
 */
export function useApproveVenue(
  client: ApiClient,
  options?: Partial<UseMutationOptions<any, Error, string>>,
) {
  return useMutation({
    mutationFn: async (venueId: string) => {
      const res = await client.post(`/venues/${venueId}/approve`, {});
      return (res as any)?.data || res;
    },
    ...options,
  });
}

/**
 * Mutation to suspend an active venue.
 * Calls POST /api/v1/venues/:id/suspend
 */
export function useSuspendVenue(
  client: ApiClient,
  options?: Partial<UseMutationOptions<any, Error, string>>,
) {
  return useMutation({
    mutationFn: async (venueId: string) => {
      const res = await client.post(`/venues/${venueId}/suspend`, {});
      return (res as any)?.data || res;
    },
    ...options,
  });
}

/**
 * Mutation to reinstate a suspended venue.
 * Calls POST /api/v1/venues/:id/reinstate
 */
export function useReinstateVenue(
  client: ApiClient,
  options?: Partial<UseMutationOptions<any, Error, string>>,
) {
  return useMutation({
    mutationFn: async (venueId: string) => {
      const res = await client.post(`/venues/${venueId}/reinstate`, {});
      return (res as any)?.data || res;
    },
    ...options,
  });
}

// ── Sport Catalog Management ─────────────────────────────────────────────────

export interface AdminSport {
  _id?: string;
  id?: string;
  key: string;
  name: string;
  isActive: boolean;
  isTeamBased?: boolean;
  allowsDraws?: boolean;
  minPlayers: number;
  maxPlayers: number;
  formats?: Array<{
    key: string;
    label: string;
    playersPerSide: number;
    isDefault: boolean;
  }>;
  scoring?: { type: string; allowsDraws: boolean };
  skillBands?: Array<{
    key: string;
    label: string;
    order: number;
    seedRating: number;
  }>;
  playStyles?: Array<{ key: string; label: string }>;
  positions?: Array<{ key: string; label: string }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminSportsListResponse {
  sports: AdminSport[];
}

/**
 * Retrieves all sports (including inactive) for admin catalog management.
 * Calls GET /api/v1/admin/sports
 */
export function useAdminSports(
  client: ApiClient,
  options?: Partial<UseQueryOptions<AdminSportsListResponse, Error>>,
) {
  return useQuery({
    queryKey: queryKeys.admin.sports(),
    queryFn: async () => {
      const res = await client.get('/admin/sports');
      return (res as any)?.data || res;
    },
    ...options,
  });
}

export interface CreateSportPayload {
  key: string;
  name: string;
  isActive?: boolean;
  isTeamBased?: boolean;
  allowsDraws?: boolean;
  minPlayers: number;
  maxPlayers: number;
  formats?: Array<{
    key: string;
    label: string;
    playersPerSide: number;
    isDefault: boolean;
  }>;
  scoring?: { type: string; allowsDraws: boolean };
  skillBands: Array<{
    key: string;
    label: string;
    order: number;
    seedRating: number;
  }>;
  playStyles: Array<{ key: string; label: string }>;
  positions?: Array<{ key: string; label: string }>;
}

/**
 * Mutation to create a new sport in the catalog.
 * Calls POST /api/v1/admin/sports
 */
export function useCreateSport(
  client: ApiClient,
  options?: Partial<UseMutationOptions<any, Error, CreateSportPayload>>,
) {
  return useMutation({
    mutationFn: async (payload: CreateSportPayload) => {
      const res = await client.post('/admin/sports', payload);
      return (res as any)?.data || res;
    },
    ...options,
  });
}

export interface UpdateSportPayload {
  sportId: string;
  body: Partial<Omit<CreateSportPayload, 'key'>>;
}

/**
 * Mutation to update an existing sport definition.
 * Calls PATCH /api/v1/admin/sports/:id
 */
export function useUpdateSport(
  client: ApiClient,
  options?: Partial<UseMutationOptions<any, Error, UpdateSportPayload>>,
) {
  return useMutation({
    mutationFn: async ({ sportId, body }: UpdateSportPayload) => {
      const res = await client.patch(`/admin/sports/${sportId}`, body);
      return (res as any)?.data || res;
    },
    ...options,
  });
}


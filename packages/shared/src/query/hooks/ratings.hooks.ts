import {
  useQuery,
  useInfiniteQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { queryKeys } from '../query-keys.js';
import { getNextCursorParam, type CursorPaginatedResponse } from '../utils/infinite-query.js';
import type { ApiClient } from '../../client/api-client.js';

export function useMyRatings(client: ApiClient, sportKey?: string, options?: Partial<UseQueryOptions<any, Error>>) {
  return useQuery({
    queryKey: queryKeys.ratings.me(sportKey),
    queryFn: () => client.get(sportKey ? `/ratings/me/${sportKey}` : '/ratings/me'),
    ...options,
  });
}

export function useRatingHistory(client: ApiClient, sportKey: string, options?: Partial<UseQueryOptions<any, Error>>) {
  return useQuery({
    queryKey: queryKeys.ratings.history(sportKey),
    queryFn: () => client.get(`/ratings/me/${sportKey}/history`),
    enabled: Boolean(sportKey),
    ...options,
  });
}

export function useLeaderboardInfinite(client: ApiClient, sportKey: string, limit = 20) {
  return useInfiniteQuery({
    queryKey: queryKeys.ratings.leaderboard(sportKey),
    queryFn: ({ pageParam }) => {
      const url = pageParam
        ? `/leaderboards/${sportKey}?cursor=${pageParam}&limit=${limit}`
        : `/leaderboards/${sportKey}?limit=${limit}`;
      return client.get<CursorPaginatedResponse<any>>(url);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => getNextCursorParam(lastPage),
    enabled: Boolean(sportKey),
  });
}

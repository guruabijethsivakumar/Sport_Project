import {
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { queryKeys } from '../query-keys.js';
import type { ApiClient } from '../../client/api-client.js';

export function useDiscoverGames(
  client: ApiClient,
  params: { latitude: number; longitude: number; radiusKm?: number; sportKey?: string },
  options?: Partial<UseQueryOptions<any, Error>>,
) {
  const queryString = new URLSearchParams({
    latitude: params.latitude.toString(),
    longitude: params.longitude.toString(),
    ...(params.radiusKm ? { radiusKm: params.radiusKm.toString() } : {}),
    ...(params.sportKey ? { sportKey: params.sportKey } : {}),
  }).toString();

  return useQuery({
    queryKey: queryKeys.discovery.games(params),
    queryFn: () => client.get(`/games/discover?${queryString}`),
    enabled: Boolean(params.latitude && params.longitude),
    ...options,
  });
}

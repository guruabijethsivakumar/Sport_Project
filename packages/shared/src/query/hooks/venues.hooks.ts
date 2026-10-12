import {
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { queryKeys } from '../query-keys.js';
import type { ApiClient } from '../../client/api-client.js';

export function useVenues(client: ApiClient, options?: Partial<UseQueryOptions<any, Error>>) {
  return useQuery({
    queryKey: queryKeys.venues.list(),
    queryFn: () => client.get('/venues'),
    ...options,
  });
}

export function useVenueDetail(client: ApiClient, venueId: string, options?: Partial<UseQueryOptions<any, Error>>) {
  return useQuery({
    queryKey: queryKeys.venues.detail(venueId),
    queryFn: () => client.get(`/venues/${venueId}`),
    enabled: Boolean(venueId),
    ...options,
  });
}

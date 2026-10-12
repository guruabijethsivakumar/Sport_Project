import {
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { queryKeys } from '../query-keys.js';
import type { ApiClient } from '../../client/api-client.js';

export interface VenuesQueryParams {
  longitude?: number;
  latitude?: number;
  sportKey?: string;
  radiusKm?: number;
  [key: string]: unknown;
}

export function useVenues(
  client: ApiClient,
  params?: VenuesQueryParams,
  options?: Partial<UseQueryOptions<any, Error>>,
) {
  const queryParams = new URLSearchParams();
  if (params?.longitude !== undefined) queryParams.set('longitude', params.longitude.toString());
  if (params?.latitude !== undefined) queryParams.set('latitude', params.latitude.toString());
  if (params?.sportKey) queryParams.set('sportKey', params.sportKey);
  if (params?.radiusKm !== undefined) queryParams.set('radiusKm', params.radiusKm.toString());
  const queryString = queryParams.toString();
  const url = queryString ? `/venues?${queryString}` : '/venues';

  return useQuery({
    queryKey: queryKeys.venues.list(params),
    queryFn: () => client.get(url),
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

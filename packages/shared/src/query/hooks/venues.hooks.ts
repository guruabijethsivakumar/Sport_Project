import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
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

export function useMyVenues(
  client: ApiClient,
  options?: Partial<UseQueryOptions<any, Error>>,
) {
  return useQuery({
    queryKey: queryKeys.venues.mine(),
    queryFn: () => client.get('/venues/mine'),
    ...options,
  });
}

export function useCreateVenue(
  client: ApiClient,
  options?: UseMutationOptions<any, Error, any>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => client.post('/venues', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.venues.mine() });
      queryClient.invalidateQueries({ queryKey: queryKeys.venues.all });
    },
    ...options,
  });
}

export function useUpdateVenue(
  client: ApiClient,
  venueId: string,
  options?: UseMutationOptions<any, Error, any>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => client.patch(`/venues/${venueId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.venues.mine() });
      queryClient.invalidateQueries({ queryKey: queryKeys.venues.detail(venueId) });
    },
    ...options,
  });
}

export function useAddCourt(
  client: ApiClient,
  venueId: string,
  options?: UseMutationOptions<any, Error, any>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => client.post(`/venues/${venueId}/courts`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.venues.detail(venueId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.venues.mine() });
    },
    ...options,
  });
}

export function useUpdateCourt(
  client: ApiClient,
  venueId: string,
  options?: UseMutationOptions<any, Error, { courtId: string; body: any }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courtId, body }: { courtId: string; body: any }) =>
      client.patch(`/venues/${venueId}/courts/${courtId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.venues.detail(venueId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.venues.mine() });
    },
    ...options,
  });
}

export function useSetWeeklyHours(
  client: ApiClient,
  venueId: string,
  options?: UseMutationOptions<any, Error, any>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => client.put(`/venues/${venueId}/hours`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.venues.detail(venueId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.venues.mine() });
    },
    ...options,
  });
}

export function useAddClosure(
  client: ApiClient,
  venueId: string,
  options?: UseMutationOptions<any, Error, any>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => client.post(`/venues/${venueId}/closures`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.venues.detail(venueId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.venues.mine() });
    },
    ...options,
  });
}

export function useRemoveClosure(
  client: ApiClient,
  venueId: string,
  options?: UseMutationOptions<any, Error, string>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (closureId: string) => client.delete(`/venues/${venueId}/closures/${closureId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.venues.detail(venueId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.venues.mine() });
    },
    ...options,
  });
}

export function useVenueAvailability(
  client: ApiClient,
  venueId: string,
  date: string,
  options?: Partial<UseQueryOptions<any, Error>>,
) {
  return useQuery({
    queryKey: queryKeys.venues.availability(venueId, 'all', date),
    queryFn: () => client.get(`/venues/${venueId}/availability?date=${date}`),
    enabled: Boolean(venueId && date),
    ...options,
  });
}


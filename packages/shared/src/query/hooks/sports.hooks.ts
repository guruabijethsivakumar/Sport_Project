import {
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { queryKeys } from '../query-keys.js';
import type { ApiClient } from '../../client/api-client.js';

export function useSportsCatalog(client: ApiClient, options?: Partial<UseQueryOptions<any, Error>>) {
  return useQuery({
    queryKey: queryKeys.sports.catalog(),
    queryFn: () => client.get('/sports'),
    staleTime: 1000 * 60 * 60, // Sports catalog rarely changes
    ...options,
  });
}

export function useSportDetail(client: ApiClient, sportKey: string, options?: Partial<UseQueryOptions<any, Error>>) {
  return useQuery({
    queryKey: queryKeys.sports.detail(sportKey),
    queryFn: () => client.get(`/sports/${sportKey}`),
    enabled: Boolean(sportKey),
    ...options,
  });
}

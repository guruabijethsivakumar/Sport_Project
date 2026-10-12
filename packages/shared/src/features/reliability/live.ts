import type { ProfileReliabilityResponse } from './contract.js';
import type { ApiClient } from '../../client/api-client.js';

/**
 * Fetches reliability score and attendance stats for a given user (or current user if 'me').
 * GET /api/v1/reliability/:userId or GET /api/v1/reliability/me
 *
 * The ApiClient already unwraps the { success: true, data: T } envelope.
 */
export async function getLiveReliability(
  client: ApiClient,
  userId: string = 'me',
): Promise<ProfileReliabilityResponse> {
  const target = !userId || userId === 'me' ? 'me' : userId;
  const data = await client.get<ProfileReliabilityResponse>(`/reliability/${target}`);
  return data as ProfileReliabilityResponse;
}

/**
 * Fetches reliability score and attendance stats for the currently authenticated user.
 * GET /api/v1/reliability/me
 */
export async function getLiveMyReliability(
  client: ApiClient,
): Promise<ProfileReliabilityResponse> {
  return getLiveReliability(client, 'me');
}

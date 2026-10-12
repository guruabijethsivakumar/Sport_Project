import type { ProfileReliabilityResponse } from './contract.js';
import type { ApiClient } from '../../client/api-client.js';

/**
 * Fetches reliability score and attendance stats for a given user.
 * GET /api/v1/reliability/:userId
 *
 * The ApiClient already unwraps the { success: true, data: T } envelope.
 */
export async function getLiveReliability(
  client: ApiClient,
  userId: string,
): Promise<ProfileReliabilityResponse> {
  const data = await client.get<ProfileReliabilityResponse>(`/reliability/${userId}`);
  return data as ProfileReliabilityResponse;
}

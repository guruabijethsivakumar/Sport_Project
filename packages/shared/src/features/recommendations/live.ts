import type { RecommendationsResponse } from './contract.js';
import type { ApiClient } from '../../client/api-client.js';

/**
 * Fetches personalized AI game recommendations from the live API.
 * GET /api/v1/recommendations
 *
 * The ApiClient already unwraps the { success: true, data: T } envelope,
 * so the returned value is the inner `data` payload directly.
 */
export async function getLiveRecommendations(
  client: ApiClient,
): Promise<RecommendationsResponse> {
  const data = await client.get<RecommendationsResponse>('/recommendations');
  return data as RecommendationsResponse;
}

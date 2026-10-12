import type { GameResultResponse } from './contract.js';
import type { ApiClient } from '../../client/api-client.js';

/**
 * Fetches the current result/verification state for a game.
 * GET /api/v1/games/:id/results
 *
 * The ApiClient already unwraps the { success: true, data: T } envelope.
 */
export async function getLiveGameResult(
  client: ApiClient,
  gameId: string,
): Promise<GameResultResponse> {
  const data = await client.get<GameResultResponse>(`/games/${gameId}/results`);
  return data as GameResultResponse;
}

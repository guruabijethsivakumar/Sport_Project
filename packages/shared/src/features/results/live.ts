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
  try {
    const data = await client.get<GameResultResponse>(`/games/${gameId}/results`);
    return data as GameResultResponse;
  } catch (err: any) {
    if (
      err?.code === 'RESULT_NOT_FOUND' ||
      err?.status === 404 ||
      err?.statusCode === 404 ||
      err?.message?.toLowerCase().includes('not found') ||
      err?.message?.toLowerCase().includes('no result proposal')
    ) {
      return {
        gameId,
        status: 'no_result',
        whoMustActNext: [],
        ratingStatus: 'not_processed',
      };
    }
    throw err;
  }
}

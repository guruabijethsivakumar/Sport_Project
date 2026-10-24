import type { TeamSuggestionResponse } from './contract.js';
import type { ApiClient } from '../../client/api-client.js';

/**
 * Fetches AI-balanced team suggestions for a given game.
 * GET /api/v1/games/:gameId/teams
 *
 * The ApiClient already unwraps the { success: true, data: T } envelope.
 */
export async function getLiveTeamSuggestion(
  client: ApiClient,
  gameId: string,
): Promise<TeamSuggestionResponse | null> {
  try {
    const data = await client.get<TeamSuggestionResponse>(`/games/${gameId}/teams`);
    return data as TeamSuggestionResponse;
  } catch (err: any) {
    if (
      err?.code === 'TEAMS_NOT_FOUND' ||
      err?.status === 404 ||
      err?.statusCode === 404 ||
      err?.message?.toLowerCase().includes('not been generated') ||
      err?.message?.toLowerCase().includes('teams have not been')
    ) {
      return null;
    }
    throw err;
  }
}

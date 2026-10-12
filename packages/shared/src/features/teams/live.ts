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
): Promise<TeamSuggestionResponse> {
  const data = await client.get<TeamSuggestionResponse>(`/games/${gameId}/teams`);
  return data as TeamSuggestionResponse;
}

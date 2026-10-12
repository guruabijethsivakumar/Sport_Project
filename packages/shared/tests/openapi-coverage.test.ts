import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as hooks from '../src/query/hooks.js';

export interface HookContractMapping {
  hookName: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  expectedQueryParams?: string[];
}

export const HOOK_SPEC_MAPPINGS: HookContractMapping[] = [
  // Auth
  { hookName: 'useLogin', method: 'POST', path: '/api/v1/auth/login' },
  { hookName: 'useRegister', method: 'POST', path: '/api/v1/auth/register' },
  { hookName: 'useLogout', method: 'POST', path: '/api/v1/auth/logout' },

  // Sports Catalog
  { hookName: 'useSportsCatalog', method: 'GET', path: '/api/v1/sports' },

  // Profile & Onboarding
  { hookName: 'useMyProfile', method: 'GET', path: '/api/v1/profile/me' },
  { hookName: 'useOnboardingStatus', method: 'GET', path: '/api/v1/profile/me/onboarding' },

  // Ratings & Leaderboards
  { hookName: 'useMyRatings', method: 'GET', path: '/api/v1/ratings/me' },
  { hookName: 'useRatingHistory', method: 'GET', path: '/api/v1/ratings/me/{sportKey}/history' },
  { hookName: 'useLeaderboardInfinite', method: 'GET', path: '/api/v1/leaderboards/{sportKey}' },

  // Games
  { hookName: 'useMyGames', method: 'GET', path: '/api/v1/games/me' },
  { hookName: 'useGameDetail', method: 'GET', path: '/api/v1/games/{id}' },
  { hookName: 'useGameRoster', method: 'GET', path: '/api/v1/games/{id}/roster' },
  { hookName: 'useCreateGame', method: 'POST', path: '/api/v1/games' },
  { hookName: 'useJoinGame', method: 'POST', path: '/api/v1/games/{id}/join' },
  { hookName: 'useLeaveGame', method: 'POST', path: '/api/v1/games/{id}/leave' },

  // Discovery
  {
    hookName: 'useDiscoverGames',
    method: 'GET',
    path: '/api/v1/games/discover',
    expectedQueryParams: ['latitude', 'longitude'],
  },

  // Venues
  {
    hookName: 'useVenues',
    method: 'GET',
    path: '/api/v1/venues',
    expectedQueryParams: ['latitude', 'longitude', 'sportKey', 'radiusKm'],
  },
  { hookName: 'useVenueDetail', method: 'GET', path: '/api/v1/venues/{id}' },
];

describe('OpenAPI Operation to Hook Verification', () => {
  it('checks every hook HTTP method, path and query parameter names against server/openapi.json', () => {
    const specPath = path.resolve(__dirname, '../../../server/openapi.json');
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
    const availableHookNames = new Set(Object.keys(hooks));

    for (const mapping of HOOK_SPEC_MAPPINGS) {
      // 1. Verify hook exists in exports
      expect(availableHookNames.has(mapping.hookName)).toBe(true);

      // 2. Verify path exists in OpenAPI spec
      const pathItem = spec.paths[mapping.path];
      expect(
        pathItem,
        `Path ${mapping.path} for hook ${mapping.hookName} must exist in openapi.json`
      ).toBeDefined();

      // 3. Verify HTTP method exists on the path
      const operation = pathItem[mapping.method.toLowerCase()];
      expect(
        operation,
        `Method ${mapping.method} on ${mapping.path} for hook ${mapping.hookName} must exist in openapi.json`
      ).toBeDefined();

      // 4. Verify query parameters exist in OpenAPI spec
      if (mapping.expectedQueryParams && mapping.expectedQueryParams.length > 0) {
        const specQueryParams = (operation.parameters || [])
          .filter((p: any) => p.in === 'query')
          .map((p: any) => p.name);

        for (const queryParam of mapping.expectedQueryParams) {
          expect(
            specQueryParams,
            `Query parameter "${queryParam}" must exist in ${mapping.method} ${mapping.path} spec parameters`
          ).toContain(queryParam);
        }
      }
    }
  });
});

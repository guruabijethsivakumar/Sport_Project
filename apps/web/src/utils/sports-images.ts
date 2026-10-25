/**
 * Curated high-resolution outdoor sports grounds and sport-specific imagery.
 * Designed to ensure varied, non-repeating, outdoor imagery (no gym or indoor weight-room photos).
 */

const OUTDOOR_VENUE_GROUNDS: readonly string[] = [
  // 1. Lush outdoor football / multi-sport turf pitch with evening lighting
  'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80',
  // 2. Outdoor green sports turf ground
  'https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&w=1200&q=80',
  // 3. Outdoor tennis court with clay turf & net
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=80',
  // 4. Sunlit outdoor athletics & soccer stadium ground
  'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
  // 5. Expansive outdoor cricket / multi-sport ground
  'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80',
  // 6. Crisp grass turf pitch
  'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=1200&q=80',
  // 7. Outdoor blue surface multi-sport court complex
  'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?auto=format&fit=crop&w=1200&q=80',
  // 8. Outdoor stadium grounds with track
  'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80',
  // 9. Floodlit outdoor night turf pitch
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
  // 10. Outdoor green athletic field & court
  'https://images.unsplash.com/photo-1534158914592-062992fbe900?auto=format&fit=crop&w=1200&q=80',
];

const SPORT_GAME_IMAGES: Record<string, readonly string[]> = {
  badminton: [
    'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1613918108466-292b78a8ef95?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1521537634581-0dced2fed2a8?auto=format&fit=crop&w=800&q=80',
  ],
  cricket: [
    'https://images.unsplash.com/photo-1531415074868-836332ff4296?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?auto=format&fit=crop&w=800&q=80',
  ],
  football: [
    'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80',
  ],
  tennis: [
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=800&q=80',
  ],
  basketball: [
    'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=800&q=80',
  ],
  pickleball: [
    'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80',
  ],
  squash: [
    'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80',
  ],
};

const DEFAULT_GAME_IMAGES: readonly string[] = [
  'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
];

/**
 * Computes a deterministic integer hash from a string key.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Returns a reserved outdoor sports ground / turf photo for a venue.
 * Never repeats the gym photo; deterministically picks from 10 outdoor grounds based on venue ID/name.
 */
export function getVenueOutdoorImage(venueId?: string, venueName?: string): string {
  const seed = venueId || venueName || 'default-venue';
  const index = hashString(seed) % OUTDOOR_VENUE_GROUNDS.length;
  return OUTDOOR_VENUE_GROUNDS[index];
}

/**
 * Returns a high-definition sport-specific image for games.
 * Picks deterministically from the sport's image pool using the game ID so adjacent games
 * do not repeat the exact same image.
 */
export function getGameSportImage(sportKey?: string, gameId?: string): string {
  const key = (sportKey || '').toLowerCase().trim();
  const pool = SPORT_GAME_IMAGES[key] || DEFAULT_GAME_IMAGES;
  const seed = gameId || `${key}-match`;
  const index = hashString(seed) % pool.length;
  return pool[index];
}

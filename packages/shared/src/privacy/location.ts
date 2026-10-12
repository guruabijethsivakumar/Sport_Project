/**
 * Type-level guard that strictly prevents rendering or referencing exact distance.
 */
export type PublicDistance<T extends { exactDistanceMeters?: never }> = T;

export interface CoarsenedLocation {
  type: 'Point';
  coordinates: [number, number];
  addressName?: string;
}

/**
 * Format rounded distance for display (e.g. "2.4 km").
 * Never displays raw exact meters.
 */
export function formatDistanceKm(distanceKm: number | null | undefined): string {
  if (distanceKm === null || distanceKm === undefined) {
    return 'Distance unavailable';
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Checks whether coordinates have been coarsened to standard 2-decimal precision.
 */
export function isCoarsenedCoordinates(lng: number, lat: number): boolean {
  const lngDecimals = (lng.toString().split('.')[1] || '').length;
  const latDecimals = (lat.toString().split('.')[1] || '').length;
  return lngDecimals <= 2 && latDecimals <= 2;
}

/**
 * Coarsens coordinates to specified decimal places (defaults to 2 decimals, ~1.1km accuracy).
 */
export function coarsenCoordinates(lng: number, lat: number, decimals: number = 2): [number, number] {
  const factor = Math.pow(10, decimals);
  return [
    Math.round(lng * factor) / factor,
    Math.round(lat * factor) / factor,
  ];
}


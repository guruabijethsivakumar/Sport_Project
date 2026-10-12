import React from 'react';

export interface GameTeamsSlotProps {
  gameId: string;
  viewerRole?: string;
  fallback?: React.ReactNode;
}

/**
 * Typed slot for Dev 3's AI Team Balancing widget in GameDetailsPage.
 * Renders null (or fallback) by default until Dev 3 implements team formation UI.
 */
export function GameTeamsSlot({ fallback = null }: GameTeamsSlotProps): React.ReactElement | null {
  return fallback ? <>{fallback}</> : null;
}

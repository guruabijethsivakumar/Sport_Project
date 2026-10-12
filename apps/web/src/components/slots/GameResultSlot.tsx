import React from 'react';

export interface GameResultSlotProps {
  gameId: string;
  viewerRole?: string;
  fallback?: React.ReactNode;
}

/**
 * Typed slot for Dev 3's Match Results & Verification widget in GameDetailsPage.
 * Renders null (or fallback) by default until Dev 3 implements results flow UI.
 */
export function GameResultSlot({ fallback = null }: GameResultSlotProps): React.ReactElement | null {
  return fallback ? <>{fallback}</> : null;
}

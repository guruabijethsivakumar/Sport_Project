import React from 'react';
import { TeamBalancingView } from '../teams/TeamBalancingView';

export interface GameTeamsSlotProps {
  gameId: string;
  viewerRole?: string;
  fallback?: React.ReactNode;
  isCancelled?: boolean;
}

/**
 * Typed slot for Dev 3's AI Team Balancing widget in GameDetailsPage.
 * Automatically mounts TeamBalancingView using live gameId and viewer role permissions.
 */
export function GameTeamsSlot({
  gameId,
  viewerRole,
  fallback = null,
  isCancelled = false,
}: GameTeamsSlotProps): React.ReactElement | null {
  if (!gameId) {
    return fallback ? <>{fallback}</> : null;
  }

  const canManage =
    !isCancelled &&
    (viewerRole === 'host' ||
      viewerRole === 'organizer' ||
      viewerRole === 'admin');

  return (
    <TeamBalancingView
      gameId={gameId}
      canManage={canManage}
    />
  );
}

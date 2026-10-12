import React, { useState } from 'react';
import { useFeatureGameResult } from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
import { VerificationBanner } from '../results/VerificationBanner';
import { SubmitScoreModal } from '../results/SubmitScoreModal';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

export interface GameResultSlotProps {
  gameId: string;
  viewerRole?: string;
  fallback?: React.ReactNode;
}

/**
 * Typed slot for Dev 3's Match Results & Verification widget in GameDetailsPage.
 * Automatically displays verification actions when a score proposal is pending,
 * or host score submission controls when game is awaiting score.
 */
export function GameResultSlot({
  gameId,
  viewerRole,
  fallback = null,
}: GameResultSlotProps): React.ReactElement | null {
  const { client } = useAuth();
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  const { data: resultData, isLoading } = useFeatureGameResult(client, gameId, {
    enabled: Boolean(gameId),
  });

  if (!gameId) {
    return fallback ? <>{fallback}</> : null;
  }

  const canHostSubmit =
    viewerRole === 'host' ||
    viewerRole === 'organizer' ||
    viewerRole === 'admin';

  return (
    <div className="space-y-4">
      {/* Pending Proposal Verification Banner */}
      {resultData?.proposal && (
        <VerificationBanner
          gameId={gameId}
          proposal={resultData.proposal}
        />
      )}

      {/* Host score submission button if no result submitted yet */}
      {canHostSubmit && !resultData?.proposal && !isLoading && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="primary"
            onClick={() => setSubmitModalOpen(true)}
          >
            <Icon name="trophy" size={16} className="mr-2" />
            Submit Match Score
          </Button>
        </div>
      )}

      {submitModalOpen && (
        <SubmitScoreModal
          isOpen={submitModalOpen}
          onClose={() => setSubmitModalOpen(false)}
          gameId={gameId}
        />
      )}
    </div>
  );
}

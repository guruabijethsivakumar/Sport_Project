import React, { useState } from 'react';
import { useFeatureGameResult, useFeatureTeamSuggestion } from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
import { VerificationBanner } from '../results/VerificationBanner';
import { SubmitScoreModal } from '../results/SubmitScoreModal';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

export interface GameResultSlotProps {
  gameId: string;
  viewerRole?: string;
  fallback?: React.ReactNode;
  isCancelled?: boolean;
}

/**
 * Typed slot for Dev 3's Match Results & Verification widget in GameDetailsPage.
 * Automatically displays verification actions when a score proposal is pending,
 * verified result card once confirmed, dispute alert if contested,
 * or score submission controls when game is awaiting score.
 */
export function GameResultSlot({
  gameId,
  viewerRole,
  fallback = null,
  isCancelled = false,
}: GameResultSlotProps): React.ReactElement | null {
  const { client, user } = useAuth();
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  const { data: resultData, isLoading } = useFeatureGameResult(client, gameId, {
    enabled: Boolean(gameId),
  });

  const { data: teamData } = useFeatureTeamSuggestion(client, gameId, {
    enabled: Boolean(gameId),
  });

  const teamAName = teamData?.teams?.[0]?.name || 'Side A';
  const teamBName = teamData?.teams?.[1]?.name || 'Side B';
  const teamASideKey = teamData?.teams?.[0]?.sideKey || 'side_a';
  const teamBSideKey = teamData?.teams?.[1]?.sideKey || 'side_b';

  if (!gameId) {
    return fallback ? <>{fallback}</> : null;
  }

  const canSubmit =
    viewerRole === 'host' ||
    viewerRole === 'organizer' ||
    viewerRole === 'admin' ||
    viewerRole === 'player';

  const isPending =
    resultData?.status === 'pending_confirmation' ||
    Boolean(resultData?.proposal && resultData?.status !== 'verified' && resultData?.status !== 'disputed' && resultData?.status !== 'resolved');

  const isVerified = resultData?.status === 'verified' || resultData?.status === 'resolved';
  const isDisputed = resultData?.status === 'disputed';
  const hasNoResult = !resultData?.proposal || resultData?.status === 'no_result';

  const currentUserId = user?.id || (user as any)?._id;
  const isProposer = Boolean(
    currentUserId &&
      (String(resultData?.proposal?.proposedByUserId) === String(currentUserId) ||
        String((resultData?.proposal as any)?.submittedBy) === String(currentUserId))
  );
  const isInWhoMustAct = Boolean(
    currentUserId &&
      resultData?.whoMustActNext?.some((uid: any) => String(uid) === String(currentUserId))
  );
  const canAct =
    !isProposer &&
    (isInWhoMustAct ||
      (resultData as any)?.isMock ||
      !resultData?.whoMustActNext?.length ||
      viewerRole === 'host' ||
      viewerRole === 'player');

  return (
    <div className="space-y-4">
      {/* 1. Pending Proposal Verification Banner */}
      {isPending && resultData?.proposal && (
        <VerificationBanner
          gameId={gameId}
          proposal={resultData.proposal}
          canAct={canAct}
          proposerName={isProposer ? 'You' : 'Opponent'}
          sideAName={teamAName}
          sideBName={teamBName}
        />
      )}

      {/* 2. Verified Result Card */}
      {isVerified && resultData?.proposal && (
        <div className="rounded-2xl border border-success/30 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-bold text-success ring-1 ring-inset ring-success/30">
                <Icon name="check-circle" size={14} />
                Match Verified
              </span>
              <span className="text-xs text-muted-foreground">
                Ratings {resultData.ratingStatus === 'applied' ? 'Applied' : 'Processed'}
              </span>
            </div>
            {resultData.proposal.proposedAt && (
              <span className="text-xs text-muted-foreground">
                {new Date(resultData.proposal.proposedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="mt-4 flex items-center justify-around">
            <div className="text-center">
              <span className="text-xs font-semibold text-muted-foreground">{teamAName}</span>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-2xl font-black text-foreground">
                  {resultData.proposal.scores[0]?.score ?? 0}
                </span>
                {resultData.proposal.scores[0]?.winner && (
                  <Icon name="trophy" size={16} className="text-warning" />
                )}
              </div>
            </div>
            <div className="text-xl font-bold text-muted-foreground">:</div>
            <div className="text-center">
              <span className="text-xs font-semibold text-muted-foreground">{teamBName}</span>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-2xl font-black text-foreground">
                  {resultData.proposal.scores[1]?.score ?? 0}
                </span>
                {resultData.proposal.scores[1]?.winner && (
                  <Icon name="trophy" size={16} className="text-warning" />
                )}
              </div>
            </div>
          </div>
          {resultData.proposal.notes && (
            <p className="mt-3 text-xs italic text-muted-foreground text-center">
              &quot;{resultData.proposal.notes}&quot;
            </p>
          )}
        </div>
      )}

      {/* 3. Disputed Match Notice */}
      {isDisputed && (
        <div className="rounded-2xl border border-danger/30 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-danger/15 text-danger">
              <Icon name="alert-circle" size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Match Result Disputed
              </h4>
              <p className="text-xs text-muted-foreground">
                The reported score is contested. Elo rating adjustments are paused pending review.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Score submission controls when no result is submitted yet */}
      {hasNoResult && !isLoading && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Match Scores</h4>
            <p className="text-xs text-muted-foreground">
              {isCancelled
                ? 'This match has been cancelled. Score submission and Elo updates are disabled.'
                : canSubmit
                ? 'Submit match results after game completion to update player ratings.'
                : 'Awaiting participants to complete the match and report scores.'}
            </p>
          </div>
          {canSubmit && (
            <Button
              type="button"
              variant={isCancelled ? 'outline' : 'primary'}
              size="sm"
              disabled={isCancelled}
              onClick={() => !isCancelled && setSubmitModalOpen(true)}
              className={isCancelled ? 'opacity-50 cursor-not-allowed' : ''}
            >
              <Icon name="trophy" size={16} className="mr-2" />
              {isCancelled ? 'Match Cancelled' : 'Submit Score'}
            </Button>
          )}
        </div>
      )}

      {submitModalOpen && !isCancelled && (
        <SubmitScoreModal
          isOpen={submitModalOpen}
          onClose={() => setSubmitModalOpen(false)}
          gameId={gameId}
          sideAName={teamAName}
          sideBName={teamBName}
          sideAKey={teamASideKey}
          sideBKey={teamBSideKey}
        />
      )}
    </div>
  );
}

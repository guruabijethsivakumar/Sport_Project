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
 * verified result card once confirmed, dispute alert if contested,
 * or score submission controls when game is awaiting score.
 */
export function GameResultSlot({
  gameId,
  viewerRole,
  fallback = null,
}: GameResultSlotProps): React.ReactElement | null {
  const { client, user } = useAuth();
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  const { data: resultData, isLoading } = useFeatureGameResult(client, gameId, {
    enabled: Boolean(gameId),
  });

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
        />
      )}

      {/* 2. Verified Result Card */}
      {isVerified && resultData?.proposal && (
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-white to-blue-500/10 p-5 shadow-sm dark:from-emerald-950/30 dark:via-slate-900 dark:to-blue-950/30">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 ring-1 ring-inset ring-emerald-500/30 dark:text-emerald-400">
                <Icon name="check-circle" size={14} />
                Match Verified
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Ratings {resultData.ratingStatus === 'applied' ? 'Applied' : 'Processed'}
              </span>
            </div>
            {resultData.proposal.proposedAt && (
              <span className="text-xs text-slate-400">
                {new Date(resultData.proposal.proposedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="mt-4 flex items-center justify-around">
            <div className="text-center">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Side A</span>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                  {resultData.proposal.scores[0]?.score ?? 0}
                </span>
                {resultData.proposal.scores[0]?.winner && (
                  <Icon name="trophy" size={16} className="text-amber-500" />
                )}
              </div>
            </div>
            <div className="text-xl font-bold text-slate-300 dark:text-slate-600">:</div>
            <div className="text-center">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Side B</span>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                  {resultData.proposal.scores[1]?.score ?? 0}
                </span>
                {resultData.proposal.scores[1]?.winner && (
                  <Icon name="trophy" size={16} className="text-amber-500" />
                )}
              </div>
            </div>
          </div>
          {resultData.proposal.notes && (
            <p className="mt-3 text-xs italic text-slate-500 text-center">
              "{resultData.proposal.notes}"
            </p>
          )}
        </div>
      )}

      {/* 3. Disputed Match Notice */}
      {isDisputed && (
        <div className="rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-500/10 via-white to-amber-500/10 p-5 shadow-sm dark:from-red-950/30 dark:via-slate-900 dark:to-amber-950/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-600 dark:text-red-400">
              <Icon name="alert-circle" size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Match Result Disputed
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The reported score is contested. Elo rating adjustments are paused pending review.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Score submission controls when no result is submitted yet */}
      {hasNoResult && !isLoading && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Match Scores</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {canSubmit
                ? 'Submit match results after game completion to update player ratings.'
                : 'Awaiting participants to complete the match and report scores.'}
            </p>
          </div>
          {canSubmit && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setSubmitModalOpen(true)}
            >
              <Icon name="trophy" size={16} className="mr-2" />
              Submit Score
            </Button>
          )}
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

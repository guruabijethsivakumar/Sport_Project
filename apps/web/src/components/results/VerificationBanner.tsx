import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Trophy,
  Clock,
  FileText,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { useVerifyResult, useFeatureGameResult } from '@playmatch/shared';
import type { GameResultProposal } from '@playmatch/shared/features/results';
import { useAuth } from '../../auth/AuthContext';
import { DisputeModal } from './DisputeModal';

export interface VerificationBannerProps {
  gameId: string;
  proposal?: GameResultProposal;
  sideAName?: string;
  sideBName?: string;
  proposerName?: string;
  onVerified?: () => void;
  onDispute?: () => void;
  canAct?: boolean;
  className?: string;
}

export function VerificationBanner({
  gameId,
  proposal: passedProposal,
  sideAName = 'Side A',
  sideBName = 'Side B',
  proposerName = 'Opponent',
  onVerified,
  onDispute,
  canAct,
  className = '',
}: VerificationBannerProps) {
  const { client, user } = useAuth();
  const [internalDisputeOpen, setInternalDisputeOpen] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // If proposal wasn't passed directly as prop, query from shared feature hook
  const { data: gameResultData } = useFeatureGameResult(client, gameId, {
    enabled: !passedProposal && Boolean(gameId),
  });

  const proposal: GameResultProposal | undefined =
    passedProposal || gameResultData?.proposal;

  const currentUserId = user?.id || (user as any)?._id;
  const isProposer = Boolean(
    currentUserId &&
      (String(proposal?.proposedByUserId) === String(currentUserId) ||
        String((proposal as any)?.submittedBy) === String(currentUserId))
  );
  const isViewerInWhoMustAct = Boolean(
    currentUserId &&
      gameResultData?.whoMustActNext?.some((id: any) => String(id) === String(currentUserId))
  );
  const effectiveCanAct =
    typeof canAct === 'boolean'
      ? canAct
      : !isProposer && (isViewerInWhoMustAct || (gameResultData as any)?.isMock || !gameResultData?.whoMustActNext?.length);

  const verifyMutation = useVerifyResult(client, gameId);

  // If no proposal is pending verification, do not render banner
  if (!proposal) return null;

  // Extract score items
  const scoreA = proposal.scores[0]?.score ?? 0;
  const scoreB = proposal.scores[1]?.score ?? 0;
  const isAWinner = proposal.scores[0]?.winner ?? scoreA > scoreB;
  const isBWinner = proposal.scores[1]?.winner ?? scoreB > scoreA;

  // Format proposed timestamp
  const formattedDate = proposal.proposedAt
    ? new Date(proposal.proposedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const handleVerify = async () => {
    setVerifyError(null);
    try {
      await verifyMutation.mutateAsync();
      onVerified?.();
    } catch (err: any) {
      setVerifyError(
        err?.message || 'Verification failed. Please check connection and try again.'
      );
    }
  };

  const handleOpenDispute = () => {
    if (onDispute) {
      onDispute();
    } else {
      setInternalDisputeOpen(true);
    }
  };

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl border border-warning/30 bg-card p-5 shadow-sm sm:p-6 ${className}`}
      >
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Left section: Icon + Proposed Match Score */}
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning ring-1 ring-warning/30">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-warning ring-1 ring-inset ring-warning/20">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {effectiveCanAct ? 'Action Required' : 'Pending Verification'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {effectiveCanAct ? 'Score awaiting your verification' : 'Score awaiting opponent verification'}
                </span>
              </div>

              <h3 className="text-lg font-bold text-foreground">
                Match Result Proposed
              </h3>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  Submitted by{' '}
                  <strong className="text-foreground">
                    {proposerName}
                  </strong>
                </span>
                {formattedDate && (
                  <>
                    <span>•</span>
                    <span>at {formattedDate}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Center section: Proposed Scores Board */}
          <div className="flex items-center justify-center gap-4 rounded-xl border border-border bg-muted/40 px-5 py-3 shadow-2xs">
            {/* Side A */}
            <div className="text-center">
              <span className="block text-xs font-semibold text-muted-foreground truncate max-w-[100px]">
                {sideAName}
              </span>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <span
                  className={`text-2xl font-black tabular-nums ${
                    isAWinner
                      ? 'text-info'
                      : 'text-foreground'
                  }`}
                >
                  {scoreA}
                </span>
                {isAWinner && <Trophy className="h-4 w-4 text-warning" />}
              </div>
            </div>

            <div className="text-lg font-bold text-muted-foreground">:</div>

            {/* Side B */}
            <div className="text-center">
              <span className="block text-xs font-semibold text-muted-foreground truncate max-w-[100px]">
                {sideBName}
              </span>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <span
                  className={`text-2xl font-black tabular-nums ${
                    isBWinner
                      ? 'text-primary'
                      : 'text-foreground'
                  }`}
                >
                  {scoreB}
                </span>
                {isBWinner && <Trophy className="h-4 w-4 text-warning" />}
              </div>
            </div>
          </div>

          {/* Right section: Action Buttons or Awaiting Box */}
          {effectiveCanAct ? (
            <div className="flex items-center gap-3">
              {/* Confirm & Verify (Success/Green) */}
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifyMutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-success px-4 py-2.5 text-sm font-bold text-success-foreground shadow-sm transition-all hover:bg-success-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {verifyMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm & Verify</span>
                  </>
                )}
              </button>

              {/* Dispute (Danger/Red) */}
              <button
                type="button"
                onClick={handleOpenDispute}
                disabled={verifyMutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-bold text-danger-foreground shadow-sm transition-all hover:bg-danger-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Dispute</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-xs text-foreground shadow-2xs">
              <Clock className="h-4 w-4 shrink-0 animate-pulse text-warning" />
              <span>
                {proposerName === 'You'
                  ? 'Score submitted by you. Waiting for opponent to verify or dispute.'
                  : 'Score proposal submitted. Awaiting participant verification.'}
              </span>
            </div>
          )}
        </div>

        {/* Optional Notes from proposer */}
        {proposal.notes && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <FileText className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
            <span className="italic">&quot;{proposal.notes}&quot;</span>
          </div>
        )}

        {/* Verification Error message */}
        {verifyError && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>{verifyError}</span>
          </div>
        )}
      </div>

      {/* Internal Dispute Modal fallback when onDispute isn't provided */}
      {!onDispute && (
        <DisputeModal
          isOpen={internalDisputeOpen}
          onClose={() => setInternalDisputeOpen(false)}
          gameId={gameId}
          proposedScores={proposal.scores}
        />
      )}
    </>
  );
}

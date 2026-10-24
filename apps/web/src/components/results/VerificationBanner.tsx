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
        className={`relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-white to-emerald-500/10 p-5 shadow-lg backdrop-blur-md dark:from-amber-950/30 dark:via-slate-900/90 dark:to-emerald-950/30 sm:p-6 ${className}`}
      >
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute -left-10 -top-10 h-36 w-36 rounded-full bg-amber-500/15 blur-2xl dark:bg-amber-500/20" />
        <div className="pointer-events-none absolute -right-10 -bottom-10 h-36 w-36 rounded-full bg-emerald-500/15 blur-2xl dark:bg-emerald-500/20" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Left section: Icon + Proposed Match Score */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30 dark:text-amber-400">
              <Clock className="h-6 w-6 animate-pulse" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {effectiveCanAct ? 'Action Required' : 'Pending Verification'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {effectiveCanAct ? 'Score awaiting your verification' : 'Score awaiting opponent verification'}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                Match Result Proposed
              </h3>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                <span>
                  Submitted by{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {proposerName}
                  </strong>
                </span>
                {formattedDate && (
                  <>
                    <span>•</span>
                    <span className="text-slate-500">at {formattedDate}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Center section: Proposed Scores Board */}
          <div className="flex items-center justify-center gap-4 rounded-2xl border border-slate-200/80 bg-white/80 px-6 py-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-800/80">
            {/* Side A */}
            <div className="text-center">
              <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[100px]">
                {sideAName}
              </span>
              <div className="flex items-center justify-center gap-1">
                <span
                  className={`text-2xl font-black tabular-nums ${
                    isAWinner
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {scoreA}
                </span>
                {isAWinner && <Trophy className="h-4 w-4 text-amber-500" />}
              </div>
            </div>

            <div className="text-lg font-bold text-slate-300 dark:text-slate-600">:</div>

            {/* Side B */}
            <div className="text-center">
              <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[100px]">
                {sideBName}
              </span>
              <div className="flex items-center justify-center gap-1">
                <span
                  className={`text-2xl font-black tabular-nums ${
                    isBWinner
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {scoreB}
                </span>
                {isBWinner && <Trophy className="h-4 w-4 text-amber-500" />}
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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition-all hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-600/35 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-red-600/20 transition-all hover:bg-red-500 hover:shadow-lg hover:shadow-red-600/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Dispute</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-white/80 dark:bg-slate-800/80 px-4 py-3 text-xs text-amber-700 dark:text-amber-300 shadow-xs">
              <Clock className="h-4 w-4 shrink-0 animate-pulse text-amber-600" />
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
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200/60 bg-white/50 p-3 text-xs text-slate-600 dark:border-slate-800/60 dark:bg-slate-900/50 dark:text-slate-300">
            <FileText className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
            <span className="italic">"{proposal.notes}"</span>
          </div>
        )}

        {/* Verification Error message */}
        {verifyError && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400">
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

import React, { useState } from 'react';
import {
  Users,
  Scale,
  RefreshCw,
  Zap,
  Shield,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Award,
  ChevronRight,
  TrendingUp,
  Crown,
} from 'lucide-react';
import { useFeatureTeamSuggestion, useRegenerateTeams } from '@playmatch/shared';
import type {
  TeamPlayer,
  SuggestedTeam,
  TeamSuggestionResponse,
} from '@playmatch/shared/features/teams';
import { useAuth } from '../../auth/AuthContext';

export interface TeamBalancingViewProps {
  gameId?: string;
  initialData?: TeamSuggestionResponse;
  canManage?: boolean;
  onTeamsRegenerated?: (data?: TeamSuggestionResponse) => void;
  className?: string;
}

// ─── Solver simulation steps ─────────────────────────────────────────────────
const SOLVER_STEPS = [
  'Analyzing player rating distributions...',
  'Executing snake-draft round permutations (A-B-B-A)...',
  'Minimizing side Elo variance & balancing roles...',
  'Finalizing balanced rosters...',
];

export function TeamBalancingView({
  gameId = 'default-game',
  initialData,
  canManage = true,
  onTeamsRegenerated,
  className = '',
}: TeamBalancingViewProps) {
  const { client } = useAuth();
  const [isSolving, setIsSolving] = useState(false);
  const [solverStepIndex, setSolverStepIndex] = useState(0);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Hook for team suggestion (used when initialData is not passed)
  const {
    data: fetchedData,
    isLoading: isQueryLoading,
    isError,
    error,
    isMock,
    refetch,
  } = useFeatureTeamSuggestion(client, gameId, {
    enabled: !initialData && Boolean(gameId),
  });

  // Mutation for backend regeneration
  const regenerateMutation = useRegenerateTeams(client, gameId);

  const teamData: TeamSuggestionResponse | undefined | null = initialData || fetchedData;

  const handleRegenerate = async () => {
    if (isSolving) return;
    setIsSolving(true);
    setSolverStepIndex(0);
    setGenerateError(null);

    // Visual snake draft solver animation cycle
    const stepInterval = setInterval(() => {
      setSolverStepIndex((prev) => (prev < SOLVER_STEPS.length - 1 ? prev + 1 : prev));
    }, 400);

    try {
      if (gameId && !initialData) {
        await regenerateMutation.mutateAsync();
        await refetch();
      } else {
        // Fallback simulated solver latency
        await new Promise((r) => setTimeout(r, 1500));
      }
      onTeamsRegenerated?.(teamData ?? undefined);
    } catch (err: any) {
      setGenerateError(err?.message || 'Failed to generate teams. Ensure enough players have joined the roster.');
      await refetch();
    } finally {
      clearInterval(stepInterval);
      setTimeout(() => {
        setIsSolving(false);
        setSolverStepIndex(0);
      }, 350);
    }
  };

  const renderEmptyState = () => (
    <div
      className={`relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-8 ${className}`}
    >
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
          <Scale className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
          Teams have not been generated yet
        </h3>
        <p className="mt-1.5 max-w-md text-sm text-slate-500 dark:text-slate-400">
          {canManage
            ? 'As host, you can generate balanced rosters using Elo ratings once enough players join the match.'
            : 'The match host has not generated balanced teams yet. Rosters will appear here once finalized.'}
        </p>

        {canManage && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isSolving || regenerateMutation.isPending}
              className="group relative inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:shadow-lg hover:shadow-indigo-500/30 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshCw
                className={`h-4 w-4 transition-transform ${
                  isSolving || regenerateMutation.isPending ? 'animate-spin' : 'group-hover:rotate-180'
                }`}
              />
              <span>{isSolving ? 'Solving Draft...' : 'Generate Balanced Teams'}</span>
            </button>
            {generateError && (
              <p className="text-xs font-medium text-red-500 dark:text-red-400 max-w-sm text-center">
                {generateError}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (!initialData && isQueryLoading) {
    return <TeamBalancingSkeleton />;
  }

  if (!initialData && isError) {
    const isForbidden =
      (error as any)?.code === 'FORBIDDEN_ACCESS' ||
      (error as any)?.status === 403 ||
      error?.message?.toLowerCase().includes('permission');

    const isTeamsNotFound =
      (error as any)?.code === 'TEAMS_NOT_FOUND' ||
      (error as any)?.status === 404 ||
      error?.message?.toLowerCase().includes('not been generated') ||
      error?.message?.toLowerCase().includes('teams have not been');

    if (isTeamsNotFound) {
      return renderEmptyState();
    }

    if (isForbidden) {
      return (
        <div className={`rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/90 text-center ${className}`}>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <Shield className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Team Roster Restricted
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Team balancing rosters are visible to match participants only.
          </p>
        </div>
      );
    }

    return (
      <div className={`rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center ${className}`}>
        <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-400" />
        <h3 className="text-base font-semibold text-red-300">Failed to load team split</h3>
        <p className="mt-1 text-sm text-red-400/80">
          {error?.message || 'Unable to balance teams at this moment.'}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300 ring-1 ring-inset ring-red-500/20 hover:bg-red-500/20"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  // If no teams returned or empty team list, render clean empty state
  if (!teamData || !teamData.teams || teamData.teams.length === 0) {
    return renderEmptyState();
  }

  // Fallback defaults if no teams returned yet
  const sideA: SuggestedTeam = teamData?.teams[0] || {
    sideKey: 'side_a',
    name: 'Side A',
    players: [],
    ratingTotal: 0,
    ratingAverage: 0,
  };

  const sideB: SuggestedTeam = teamData?.teams[1] || {
    sideKey: 'side_b',
    name: 'Side B',
    players: [],
    ratingTotal: 0,
    ratingAverage: 0,
  };

  const delta = Math.abs(sideA.ratingTotal - sideB.ratingTotal);
  const totalRosterCount = sideA.players.length + sideB.players.length;

  // Delta quality scoring
  const isPerfect = delta === 0;
  const isExcellent = delta <= 25;
  const isFair = delta <= 60;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-8 ${className}`}
    >
      {/* Background ambient accents */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl dark:bg-blue-600/10" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-purple-500/5 blur-3xl dark:bg-purple-600/10" />

      {/* Header bar: Title, Solver Badge & Regenerate CTA */}
      <div className="relative mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                Balanced Team Rosters
              </h2>
              {isMock && (
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400">
                  Demo
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Optimal Elo snake-draft distribution across {totalRosterCount} players
            </p>
          </div>
        </div>

        {/* Regenerate Button */}
        {canManage && (
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isSolving || regenerateMutation.isPending}
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/30 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <RefreshCw
              className={`h-4 w-4 transition-transform ${
                isSolving || regenerateMutation.isPending ? 'animate-spin' : 'group-hover:rotate-180'
              }`}
            />
            <span>{isSolving ? 'Solving Draft...' : 'Regenerate Balanced Teams'}</span>
          </button>
        )}
      </div>

      {/* Solver Visual Simulation State Banner (when drafting is active) */}
      {isSolving && (
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 p-5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-inner">
              <Zap className="h-4 w-4 animate-bounce" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Snake Draft Elo Solver Active
                </span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Step {solverStepIndex + 1} of {SOLVER_STEPS.length}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {SOLVER_STEPS[solverStepIndex]}
              </p>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-300"
              style={{
                width: `${((solverStepIndex + 1) / SOLVER_STEPS.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Balance Delta Overview Panel */}
      <div className="mb-6 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4.5 dark:border-slate-800/80 dark:bg-slate-800/40">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold ring-1 ring-inset ${
                isPerfect
                  ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400'
                  : isExcellent
                    ? 'bg-blue-500/10 text-blue-600 ring-blue-500/30 dark:text-blue-400'
                    : isFair
                      ? 'bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:text-amber-400'
                      : 'bg-rose-500/10 text-rose-600 ring-rose-500/30 dark:text-rose-400'
              }`}
            >
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Balance Rating Delta
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                    isPerfect
                      ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400'
                      : isExcellent
                        ? 'bg-blue-500/10 text-blue-600 ring-blue-500/30 dark:text-blue-400'
                        : isFair
                          ? 'bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:text-amber-400'
                          : 'bg-rose-500/10 text-rose-600 ring-rose-500/30 dark:text-rose-400'
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {isPerfect
                    ? 'Perfect Balance (0 Δ)'
                    : isExcellent
                      ? `Excellent Match (Δ ${delta} Elo)`
                      : isFair
                        ? `Fair Variance (Δ ${delta} Elo)`
                        : `Higher Variance (Δ ${delta} Elo)`}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Algorithm:{' '}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {teamData?.balance.method.replace(/_/g, ' ') || 'Snake Draft Elo Solver'}
                </span>
              </p>
            </div>
          </div>

          {/* Quick delta numbers comparison */}
          <div className="flex items-center gap-4 text-right">
            <div>
              <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {sideA.name} Total
              </span>
              <span className="text-sm font-bold tabular-nums text-blue-600 dark:text-blue-400">
                {sideA.ratingTotal.toLocaleString()} Elo
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-400">vs</div>
            <div>
              <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {sideB.name} Total
              </span>
              <span className="text-sm font-bold tabular-nums text-purple-600 dark:text-purple-400">
                {sideB.ratingTotal.toLocaleString()} Elo
              </span>
            </div>
          </div>
        </div>

        {/* Reasons pills */}
        {teamData?.reasons && teamData.reasons.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-2 border-t border-slate-200/60 pt-3 dark:border-slate-800/60">
            {teamData.reasons.map((reason, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-2xs ring-1 ring-slate-200/80 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-700/60"
              >
                <Sparkles className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                {reason}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Side A vs Side B Rosters Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TeamRosterColumn
          team={sideA}
          theme="blue"
          tagLabel="Side A"
          isSolving={isSolving}
        />
        <TeamRosterColumn
          team={sideB}
          theme="purple"
          tagLabel="Side B"
          isSolving={isSolving}
        />
      </div>
    </div>
  );
}

// ─── Single Team Column Component ───────────────────────────────────────────

interface TeamRosterColumnProps {
  team: SuggestedTeam;
  theme: 'blue' | 'purple';
  tagLabel: string;
  isSolving: boolean;
}

function TeamRosterColumn({ team, theme, tagLabel, isSolving }: TeamRosterColumnProps) {
  const isBlue = theme === 'blue';

  const themeClasses = isBlue
    ? {
        border: 'border-blue-500/20 dark:border-blue-500/30',
        headerBg: 'bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent',
        badgeBg: 'bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-400',
        ringGlow: 'hover:border-blue-500/40',
        accentText: 'text-blue-600 dark:text-blue-400',
        avatarBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      }
    : {
        border: 'border-purple-500/20 dark:border-purple-500/30',
        headerBg: 'bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent',
        badgeBg: 'bg-purple-500/10 text-purple-600 ring-purple-500/20 dark:text-purple-400',
        ringGlow: 'hover:border-purple-500/40',
        accentText: 'text-purple-600 dark:text-purple-400',
        avatarBg: 'bg-gradient-to-br from-purple-500 to-pink-600',
      };

  return (
    <div
      className={`flex flex-col rounded-2xl border ${themeClasses.border} ${themeClasses.ringGlow} bg-slate-50/50 backdrop-blur-xs transition-all dark:bg-slate-900/60`}
    >
      {/* Team Header */}
      <div className={`rounded-t-2xl border-b border-slate-200/80 p-5 dark:border-slate-800 ${themeClasses.headerBg}`}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ring-1 ring-inset ${themeClasses.badgeBg}`}
            >
              <Shield className="h-3 w-3" />
              {tagLabel}
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {team.name}
            </h3>
          </div>

          <div className="text-right">
            <div className="flex items-baseline justify-end gap-1.5">
              <span className={`text-2xl font-extrabold tabular-nums tracking-tight ${themeClasses.accentText}`}>
                {team.ratingTotal.toLocaleString()}
              </span>
              <span className="text-xs font-semibold uppercase text-slate-400">Elo</span>
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Avg: <span className="font-semibold text-slate-700 dark:text-slate-300">{team.ratingAverage}</span> • {team.players.length} players
            </div>
          </div>
        </div>
      </div>

      {/* Players list */}
      <div className="flex-1 space-y-2.5 p-4 sm:p-5">
        {team.players.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-800">
            <Users className="mb-2 h-6 w-6 text-slate-400" />
            <p className="text-xs font-medium text-slate-500">No players assigned yet</p>
          </div>
        ) : (
          team.players.map((player: TeamPlayer, index: number) => {
            // Simulated snake draft pick round calculation
            // Round 1: A1, B1. Round 2: B2, A2.
            const pickNumber = isBlue
              ? index % 2 === 0
                ? index * 2 + 1
                : index * 2 + 2
              : index % 2 === 0
                ? index * 2 + 2
                : index * 2 + 1;

            return (
              <div
                key={player.userId || index}
                className={`group flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs transition-all duration-200 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/80 dark:hover:border-slate-700 ${
                  isSolving ? 'animate-pulse' : ''
                }`}
              >
                {/* Left: Avatar + Names */}
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-xs ${themeClasses.avatarBg}`}
                  >
                    {player.displayName?.slice(0, 2).toUpperCase() || 'PL'}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
                        {player.displayName}
                      </span>
                      {index === 0 && (
                        <span title="Top Seed in Side">
                          <Crown className="h-3.5 w-3.5 text-amber-500" />
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {player.position && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
                          {player.position}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        Pick #{pickNumber}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Elo Rating */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold tabular-nums text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                    <TrendingUp className="h-3 w-3 text-slate-400" />
                    {player.rating}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function TeamBalancingSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-2">
            <div className="h-5 w-48 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
        <div className="h-10 w-44 rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>

      <div className="mb-6 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800/40" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[1, 2].map((col) => (
          <div key={col} className="space-y-3 rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
            <div className="h-12 rounded-xl bg-slate-200 dark:bg-slate-800" />
            {[1, 2].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800/60" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

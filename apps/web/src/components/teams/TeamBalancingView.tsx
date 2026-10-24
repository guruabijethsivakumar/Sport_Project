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
      className={`relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-foreground shadow-sm sm:p-8 ${className}`}
    >
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Scale className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-foreground">
          Teams have not been generated yet
        </h3>
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
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
              className="group relative inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshCw
                className={`h-4 w-4 transition-transform ${
                  isSolving || regenerateMutation.isPending ? 'animate-spin' : 'group-hover:rotate-180'
                }`}
              />
              <span>{isSolving ? 'Solving Draft...' : 'Generate Balanced Teams'}</span>
            </button>
            {generateError && (
              <p className="text-xs font-medium text-danger max-w-sm text-center">
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
        <div className={`rounded-2xl border border-border bg-card p-6 text-center ${className}`}>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/15 text-warning">
            <Shield className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            Team Roster Restricted
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Team balancing rosters are visible to match participants only.
          </p>
        </div>
      );
    }

    return (
      <div className={`rounded-2xl border border-danger/30 bg-danger/10 p-6 text-center ${className}`}>
        <AlertCircle className="mx-auto mb-2 h-8 w-8 text-danger" />
        <h3 className="text-base font-semibold text-foreground">Failed to load team split</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {error?.message || 'Unable to balance teams at this moment.'}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-danger/15 px-4 py-2 text-xs font-semibold text-danger ring-1 ring-inset ring-danger/30 hover:bg-danger/25"
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

  const rawDelta = Math.abs(sideA.ratingTotal - sideB.ratingTotal);
  const delta = Math.round(rawDelta * 10) / 10;
  const totalRosterCount = sideA.players.length + sideB.players.length;

  // Delta quality scoring
  const isPerfect = delta === 0;
  const isExcellent = delta <= 25;
  const isFair = delta <= 60;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6 text-foreground shadow-sm ${className}`}
    >
      {/* Background ambient accents */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />

      {/* Header bar: Title, Solver Badge & Regenerate CTA */}
      <div className="relative mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Balanced Team Rosters
              </h2>
              {isMock && (
                <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-[11px] font-semibold text-warning ring-1 ring-inset ring-warning/20">
                  Demo
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
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
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
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
        <div className="relative mb-6 overflow-hidden rounded-xl border border-primary/30 bg-primary/10 p-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-inner">
              <Zap className="h-4 w-4 animate-bounce" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Snake Draft Elo Solver Active
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">
                  Step {solverStepIndex + 1} of {SOLVER_STEPS.length}
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {SOLVER_STEPS[solverStepIndex]}
              </p>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{
                width: `${((solverStepIndex + 1) / SOLVER_STEPS.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Balance Delta Overview Panel */}
      <div className="mb-6 rounded-xl border border-border bg-muted/30 p-4 sm:p-5">
        {/* Top: Status & Algorithm */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold ring-1 ring-inset ${
                isPerfect
                  ? 'bg-success/15 text-success ring-success/30'
                  : isExcellent
                    ? 'bg-info/15 text-info ring-info/30'
                    : isFair
                      ? 'bg-warning/15 text-warning ring-warning/30'
                      : 'bg-danger/15 text-danger ring-danger/30'
              }`}
            >
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Balance Rating Delta
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                    isPerfect
                      ? 'bg-success/15 text-success ring-success/30'
                      : isExcellent
                        ? 'bg-info/15 text-info ring-info/30'
                        : isFair
                          ? 'bg-warning/15 text-warning ring-warning/30'
                          : 'bg-danger/15 text-danger ring-danger/30'
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
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Algorithm:{' '}
                <span className="font-semibold text-foreground">
                  {teamData?.balance.method.replace(/_/g, ' ') || 'Snake Draft Elo Solver'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Middle: Side-by-Side Symmetrical Team Totals Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3.5">
          <div className="flex items-center justify-between rounded-lg border border-border/80 bg-card p-3 shadow-2xs">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {sideA.name} Total
              </span>
              <p className="text-xs text-muted-foreground">
                Avg: <span className="font-semibold text-foreground">{sideA.ratingAverage}</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-base sm:text-lg font-extrabold tabular-nums text-foreground">
                {sideA.ratingTotal.toLocaleString()}
              </span>
              <span className="ml-1 text-xs font-medium text-muted-foreground">Elo</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/80 bg-card p-3 shadow-2xs">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {sideB.name} Total
              </span>
              <p className="text-xs text-muted-foreground">
                Avg: <span className="font-semibold text-foreground">{sideB.ratingAverage}</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-base sm:text-lg font-extrabold tabular-nums text-foreground">
                {sideB.ratingTotal.toLocaleString()}
              </span>
              <span className="ml-1 text-xs font-medium text-muted-foreground">Elo</span>
            </div>
          </div>
        </div>

        {/* Reasons pills */}
        {teamData?.reasons && teamData.reasons.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-3 border-t border-border/60">
            {teamData.reasons.map((reason, idx) => {
              const formattedReason = reason.replace(/(\d+\.\d{2,})/g, (m) =>
                Number(m).toFixed(1)
              );
              return (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground shadow-2xs"
                >
                  <Sparkles className="h-3 w-3 text-primary shrink-0" />
                  <span>{formattedReason}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Side A vs Side B Rosters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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

  return (
    <div
      className="flex flex-col rounded-2xl border border-border bg-card shadow-xs transition-all overflow-hidden"
    >
      {/* Team Header */}
      <div className="border-b border-border bg-muted/40 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ring-1 ring-inset ${
                isBlue
                  ? 'bg-info/10 text-info ring-info/20'
                  : 'bg-primary/10 text-primary ring-primary/20'
              }`}
            >
              <Shield className="h-3 w-3" />
              {tagLabel}
            </span>
            <h3 className="text-lg font-bold text-foreground truncate">
              {team.name}
            </h3>
          </div>

          <div className="text-right shrink-0">
            <div className="flex items-baseline justify-end gap-1">
              <span className="text-xl sm:text-2xl font-extrabold tabular-nums tracking-tight text-foreground">
                {team.ratingTotal.toLocaleString()}
              </span>
              <span className="text-xs font-semibold uppercase text-muted-foreground">Elo</span>
            </div>
            <div className="text-[11px] font-medium text-muted-foreground">
              Avg: <span className="font-semibold text-foreground">{team.ratingAverage}</span> • {team.players.length} {team.players.length === 1 ? 'player' : 'players'}
            </div>
          </div>
        </div>
      </div>

      {/* Players list */}
      <div className="flex-1 space-y-2.5 p-4 sm:p-5">
        {team.players.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10 text-center">
            <Users className="mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">No players assigned yet</p>
          </div>
        ) : (
          team.players.map((player: TeamPlayer, index: number) => {
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
                className={`group flex items-center justify-between rounded-xl border border-border bg-card p-3.5 shadow-xs transition-all duration-200 hover:bg-muted/30 ${
                  isSolving ? 'animate-pulse' : ''
                }`}
              >
                {/* Left: Avatar + Names */}
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-xs ${
                      isBlue ? 'bg-info' : 'bg-primary'
                    }`}
                  >
                    {player.displayName?.slice(0, 2).toUpperCase() || 'PL'}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground">
                        {player.displayName}
                      </span>
                      {index === 0 && (
                        <span title="Top Seed in Side">
                          <Crown className="h-3.5 w-3.5 text-warning" />
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {player.position && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {player.position}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        Pick #{pickNumber}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Elo Rating */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs font-bold tabular-nums text-foreground">
                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
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
    <div className="animate-pulse rounded-2xl border border-border bg-card p-6 text-foreground sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-muted" />
          <div className="space-y-2">
            <div className="h-5 w-48 rounded bg-muted" />
            <div className="h-3 w-32 rounded bg-muted" />
          </div>
        </div>
        <div className="h-10 w-44 rounded-xl bg-muted" />
      </div>

      <div className="mb-6 h-20 rounded-xl bg-muted/40" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[1, 2].map((col) => (
          <div key={col} className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <div className="h-12 rounded-xl bg-muted" />
            {[1, 2].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-muted/60" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

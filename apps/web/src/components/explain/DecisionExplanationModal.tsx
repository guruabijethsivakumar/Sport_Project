import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Calculator,
  TrendingUp,
  Target,
  ShieldCheck,
  Scale,
  ChevronRight,
  Info,
  Zap,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
  Users,
} from 'lucide-react';
import {
  useExplainEligibility,
  useExplainTeams,
  useExplainRating,
  useExplainRecommendation,
  type UnifiedExplanation,
} from '@playmatch/shared';
import { useAuth, sharedApiClient } from '../../auth/AuthContext';
import { QueryClient, QueryClientProvider, QueryClientContext } from '@tanstack/react-query';

export interface GameExplanationData {
  gameTitle?: string;
  sportKey?: string;
  matchScore: number; // 0 to 1 (e.g., 0.92) or 0 to 100
  confidence?: 'low' | 'medium' | 'high';
  factors?: Array<{
    name: string;
    value: number; // 0 to 1
    weight: number;
    description?: string;
  }>;
  reasons?: string[];
}

export interface RatingExplanationData {
  sportKey?: string;
  ratingBefore: number;
  ratingAfter: number;
  delta: number;
  expectedScore?: number; // 0 to 1 (e.g. 0.42 for 42%)
  actualScore?: number; // 1 (win), 0.5 (draw), 0 (loss)
  kFactor?: number; // e.g. 32
  opponentRatingAverage?: number;
  marginOfVictory?: string;
  provisionalMultiplier?: number;
  explanationText?: string;
}

export type ExplanationModalMode = 'game' | 'rating' | 'eligibility' | 'teams';

export interface DecisionExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: ExplanationModalMode;
  gameId?: string;
  eventId?: string;
  gameData?: GameExplanationData;
  ratingData?: RatingExplanationData;
  className?: string;
}

const fallbackQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0 } },
});

export function DecisionExplanationModal(props: DecisionExplanationModalProps) {
  if (!props.isOpen) return null;

  const existingClient = React.useContext(QueryClientContext);
  if (!existingClient) {
    return (
      <QueryClientProvider client={fallbackQueryClient}>
        <DecisionExplanationModalInner {...props} />
      </QueryClientProvider>
    );
  }

  return <DecisionExplanationModalInner {...props} />;
}

function DecisionExplanationModalInner({
  isOpen,
  onClose,
  mode: initialMode = 'game',
  gameId,
  eventId,
  gameData,
  ratingData,
  className = '',
}: DecisionExplanationModalProps) {
  const auth = useAuth?.();
  const client = auth?.client || sharedApiClient;

  const [activeTab, setActiveTab] = useState<ExplanationModalMode>(initialMode);

  // Sync activeTab when mode prop changes
  useEffect(() => {
    setActiveTab(initialMode);
  }, [initialMode]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // ── Live TanStack Query Hooks ──────────────────────────────────────────────
  const eligibilityQuery = useExplainEligibility(client, gameId || '', {
    enabled: isOpen && Boolean(gameId) && (activeTab === 'eligibility' || initialMode === 'eligibility'),
  });

  const recommendationQuery = useExplainRecommendation(client, gameId || '', {
    enabled: isOpen && Boolean(gameId) && !gameData && activeTab === 'game',
  });

  const ratingQuery = useExplainRating(client, eventId || '', {
    enabled: isOpen && Boolean(eventId) && !ratingData && activeTab === 'rating',
  });

  const teamsQuery = useExplainTeams(client, gameId || '', {
    enabled: isOpen && Boolean(gameId) && activeTab === 'teams',
  });

  if (!isOpen) return null;

  // Derive active game data (prop takes precedence, then live query)
  const resolvedGameData: GameExplanationData | null =
    gameData ||
    (recommendationQuery.data
      ? {
          gameTitle: recommendationQuery.data.summary,
          matchScore: (recommendationQuery.data.metrics?.score as number) ?? 0.88,
          confidence: (recommendationQuery.data.metrics?.confidence as 'low' | 'medium' | 'high') ?? 'high',
          factors: recommendationQuery.data.factors?.map((f) => ({
            name: f.name,
            value: typeof f.value === 'number' ? f.value : 0.85,
            weight: typeof f.weight === 'number' ? f.weight : 1.0,
            description: f.description,
          })),
          reasons: recommendationQuery.data.reasons,
        }
      : null);

  // Derive active rating data (prop takes precedence, then live query)
  const resolvedRatingData: RatingExplanationData | null =
    ratingData ||
    (ratingQuery.data
      ? {
          ratingBefore: Number(ratingQuery.data.metrics?.oldRating ?? 1200),
          ratingAfter: Number(ratingQuery.data.metrics?.newRating ?? 1200),
          delta: Number(ratingQuery.data.metrics?.delta ?? 0),
          expectedScore:
            typeof ratingQuery.data.metrics?.winProbabilityPercent === 'number'
              ? Number(ratingQuery.data.metrics.winProbabilityPercent) / 100
              : 0.5,
          actualScore:
            typeof ratingQuery.data.metrics?.actualScore === 'number'
              ? Number(ratingQuery.data.metrics.actualScore)
              : undefined,
          kFactor: Number(ratingQuery.data.metrics?.kFactorUsed ?? 32),
          opponentRatingAverage: ratingQuery.data.metrics?.opponentRatingAverage
            ? Number(ratingQuery.data.metrics.opponentRatingAverage)
            : undefined,
          explanationText: ratingQuery.data.summary,
        }
      : null);

  const isEligibilityMode = activeTab === 'eligibility';
  const isTeamsMode = activeTab === 'teams';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="explanation-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className={`relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl ${className}`}
      >
        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border p-6">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                isEligibilityMode
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              {isEligibilityMode ? (
                <ShieldAlert className="h-5 w-5" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2
                id="explanation-modal-title"
                className="text-lg font-bold text-foreground"
              >
                {isEligibilityMode ? 'Eligibility Breakdown' : 'Decision Explainability'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isEligibilityMode
                  ? 'Transparent analysis of match participation constraints & requirements'
                  : 'Transparent breakdown of matchmaking AI & Elo calculations'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selector: Only render tabs if not in exclusive single-focus mode */}
        {initialMode === 'eligibility' ? (
          <div className="flex border-b border-border bg-muted/40 px-6">
            <button
              type="button"
              onClick={() => setActiveTab('eligibility')}
              className={`flex items-center gap-2 border-b-2 py-3 text-xs font-bold transition-colors ${
                activeTab === 'eligibility'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShieldAlert className="h-4 w-4" />
              Eligibility Status
            </button>
            {gameId && (
              <button
                type="button"
                onClick={() => setActiveTab('game')}
                className={`ml-6 flex items-center gap-2 border-b-2 py-3 text-xs font-bold transition-colors ${
                  activeTab === 'game'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Target className="h-4 w-4" />
                Match Fit
              </button>
            )}
          </div>
        ) : (
          <div className="flex border-b border-border bg-muted/40 px-6">
            <button
              type="button"
              onClick={() => setActiveTab('game')}
              className={`flex items-center gap-2 border-b-2 py-3 text-xs font-bold transition-colors ${
                activeTab === 'game'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Target className="h-4 w-4" />
              Why This Game?
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rating')}
              className={`ml-6 flex items-center gap-2 border-b-2 py-3 text-xs font-bold transition-colors ${
                activeTab === 'rating'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calculator className="h-4 w-4" />
              Why This Rating Change?
            </button>
            {gameId && (
              <button
                type="button"
                onClick={() => setActiveTab('teams')}
                className={`ml-6 flex items-center gap-2 border-b-2 py-3 text-xs font-bold transition-colors ${
                  activeTab === 'teams'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="h-4 w-4" />
                Team Balance
              </button>
            )}
          </div>
        )}

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'eligibility' ? (
            <EligibilityExplanationView
              isLoading={eligibilityQuery.isLoading}
              isError={eligibilityQuery.isError}
              error={eligibilityQuery.error}
              data={eligibilityQuery.data}
            />
          ) : activeTab === 'game' ? (
            <GameExplanationView
              data={resolvedGameData}
              isLoading={recommendationQuery.isLoading}
              isError={recommendationQuery.isError}
            />
          ) : activeTab === 'rating' ? (
            <RatingExplanationView
              data={resolvedRatingData}
              isLoading={ratingQuery.isLoading}
              isError={ratingQuery.isError}
            />
          ) : isTeamsMode ? (
            <TeamBalancingExplanationView
              isLoading={teamsQuery.isLoading}
              isError={teamsQuery.isError}
              data={teamsQuery.data}
            />
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t border-border bg-card p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary-hover transition-colors"
          >
            Got it, thanks
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponent: Eligibility Explanation View ("Why I'm Ineligible") ────────

function EligibilityExplanationView({
  isLoading,
  isError,
  error,
  data,
}: {
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  data?: UnifiedExplanation;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs font-medium text-muted-foreground">
          Evaluating match participation requirements...
        </p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-5 text-center text-xs">
        <AlertCircle className="mx-auto mb-2 h-6 w-6 text-destructive" />
        <p className="font-semibold text-destructive">
          {error?.message || 'Unable to retrieve eligibility explanation at this time.'}
        </p>
        <p className="mt-1 text-muted-foreground">
          Please check your network connection or verify that the match still exists.
        </p>
      </div>
    );
  }

  const isEligible = Boolean(data.metrics?.eligible ?? data.reasons?.length === 0);
  const codes = data.codes || [];

  return (
    <div className="space-y-6">
      {/* Hero Banner: Ineligible or Eligible */}
      <div
        className={`rounded-2xl border p-5 ${
          isEligible
            ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-950 dark:text-emerald-200 dark:border-emerald-500/30'
            : 'border-rose-500/20 bg-rose-500/5 text-rose-950 dark:text-rose-200 dark:border-rose-500/30'
        }`}
      >
        <div className="flex items-start gap-3">
          {isEligible ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-6 w-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <span
              className={`inline-block text-[11px] font-bold uppercase tracking-wider rounded-md px-2 py-0.5 ${
                isEligible
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
              }`}
            >
              {isEligible ? 'Eligible to Join' : 'Blocked from Joining'}
            </span>
            <h3 className="text-base font-bold text-foreground">
              {data.summary || (isEligible ? 'You meet all criteria for this match' : 'Participation requirements not met')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isEligible
                ? 'Your rating, profile, and schedule are compatible with this game.'
                : 'Review the blockers below to see what is preventing you from registering.'}
            </p>
          </div>
        </div>
      </div>

      {/* Blockers & Reasons List */}
      {data.reasons && data.reasons.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
            Identified Participation Constraints
          </h4>
          <ul className="space-y-2.5">
            {data.reasons.map((reason: string, idx: number) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-xs text-foreground bg-muted/30 p-2.5 rounded-xl border border-border/50"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-500 mt-0.5" />
                <span className="font-medium leading-relaxed">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Factors / Criteria Breakdown */}
      {data.factors && data.factors.length > 0 && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Scale className="h-3.5 w-3.5" />
            Eligibility Rule Checks
          </h4>
          <div className="space-y-2">
            {data.factors.map((factor: any, idx: number) => {
              const isPositive = factor.impact === 'positive' || factor.value >= 1;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3 text-xs"
                >
                  <span className="font-semibold text-foreground">{factor.name}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        isPositive
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isPositive ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> Met
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" /> Failed
                        </>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actionable Next Steps Resolution Card */}
      {!isEligible && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-2">
          <h4 className="font-bold text-foreground flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4 text-primary" />
            How to resolve these blockers:
          </h4>
          <ul className="text-muted-foreground space-y-1 list-disc list-inside">
            {codes.includes('sport_profile_missing') && (
              <li>Add this sport to your player profile under Profile Settings.</li>
            )}
            {codes.includes('outside_rating_range') && (
              <li>Look for matches within your current Elo rating bracket or unranked community games.</li>
            )}
            {codes.includes('schedule_conflict') && (
              <li>Resolve conflicting active matches scheduled during the same timeframe.</li>
            )}
            <li>You can also contact the match organizer to request an invitation or host override.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Subcomponent: Game Explanation View ('Why this game?') ──────────────────

function GameExplanationView({
  data,
  isLoading,
  isError,
}: {
  data: GameExplanationData | null;
  isLoading?: boolean;
  isError?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs font-medium text-muted-foreground">
          Retrieving matchmaking compatibility breakdown...
        </p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-5 text-center text-xs">
        <Target className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
        <p className="font-semibold text-foreground">
          No recommendation details found for this match.
        </p>
        <p className="mt-1 text-muted-foreground">
          Compatibility factors are calculated automatically when viewing games in the discovery feed.
        </p>
      </div>
    );
  }

  const normalizedScore =
    data.matchScore <= 1 ? Math.round(data.matchScore * 100) : Math.round(data.matchScore);

  const confidence = data.confidence || 'high';
  const confidenceColor =
    confidence === 'high'
      ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400'
      : confidence === 'medium'
        ? 'bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:text-amber-400'
        : 'bg-rose-500/10 text-rose-600 ring-rose-500/30 dark:text-rose-400';

  return (
    <div className="space-y-6">
      {/* Top Match Score Gauge Banner */}
      <div className="flex items-center justify-between rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent p-5 dark:border-indigo-500/30">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Compatibility Score
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-black tabular-nums tracking-tight text-slate-900 dark:text-white">
              {normalizedScore}%
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Match Quality
            </span>
          </div>
          {data.gameTitle && (
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              For: <strong className="font-semibold">{data.gameTitle}</strong>
            </p>
          )}
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-bold capitalize ring-1 ring-inset ${confidenceColor}`}
        >
          {confidence} Confidence
        </span>
      </div>

      {/* Factors Breakdown */}
      {data.factors && data.factors.length > 0 && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Scale className="h-3.5 w-3.5" />
            Matchmaking Factor Breakdown
          </h4>

          <div className="space-y-3">
            {data.factors.map((factor, idx) => {
              const pct = Math.round(factor.value <= 1 ? factor.value * 100 : factor.value);
              const barColor =
                pct >= 80
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                  : pct >= 60
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-400'
                    : 'bg-gradient-to-r from-amber-500 to-amber-400';

              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800/80 dark:bg-slate-800/40"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {factor.name}
                    </span>
                    <span className="font-extrabold tabular-nums text-slate-700 dark:text-slate-300">
                      {pct}%{' '}
                      <span className="text-[10px] font-normal text-slate-400">
                        (wt: {factor.weight}x)
                      </span>
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700/60">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {factor.description && (
                    <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {factor.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reasons Bullet Points */}
      {data.reasons && data.reasons.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Key Match Drivers
          </h4>
          <ul className="space-y-2">
            {data.reasons.map((reason, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-foreground"
              >
                <ChevronRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Subcomponent: Rating Explanation View ('Why this rating change?') ────────

function RatingExplanationView({
  data,
  isLoading,
  isError,
}: {
  data: RatingExplanationData | null;
  isLoading?: boolean;
  isError?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs font-medium text-muted-foreground">
          Calculating Elo rating movements and variables...
        </p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-5 text-center text-xs">
        <Calculator className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
        <p className="font-semibold text-foreground">
          No rating adjustment recorded for this event.
        </p>
        <p className="mt-1 text-muted-foreground">
          Ratings are calculated and stored once match results are verified.
        </p>
      </div>
    );
  }

  const isPositive = data.delta > 0;
  const isNegative = data.delta < 0;

  const expectedPct = data.expectedScore
    ? Math.round(data.expectedScore * 100)
    : 50;

  return (
    <div className="space-y-6">
      {/* Elo Movement Scoreboard */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-800/50">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Rating Movement
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold tabular-nums text-slate-500 dark:text-slate-400">
              {data.ratingBefore}
            </span>
            <span className="text-sm font-semibold text-slate-400">→</span>
            <span className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">
              {typeof data.ratingAfter === 'number' ? data.ratingAfter.toFixed(1) : data.ratingAfter}
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase">Elo</span>
          </div>
        </div>

        <div
          className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-sm font-black tabular-nums ring-1 ring-inset ${
            isPositive
              ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400'
              : isNegative
                ? 'bg-rose-500/10 text-rose-600 ring-rose-500/30 dark:text-rose-400'
                : 'bg-slate-500/10 text-slate-600 ring-slate-500/30 dark:text-slate-400'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>{isPositive ? `+${data.delta}` : data.delta} Elo</span>
        </div>
      </div>

      {/* Formula Variables Grid */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Calculator className="h-3.5 w-3.5" />
          Elo Formula Variables
        </h4>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {/* Expected Win Probability */}
          <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-800/80">
            <span className="block text-[11px] font-medium text-slate-400">
              Expected Win Prob. (E)
            </span>
            <span className="mt-1 block text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
              {expectedPct}%
            </span>
          </div>

          {/* Actual Result */}
          <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-800/80">
            <span className="block text-[11px] font-medium text-slate-400">
              Actual Result (S)
            </span>
            <span className="mt-1 block text-lg font-extrabold tabular-nums text-indigo-600 dark:text-indigo-400">
              {data.actualScore !== undefined
                ? data.actualScore === 1
                  ? 'Win (1.0)'
                  : data.actualScore === 0.5
                    ? 'Draw (0.5)'
                    : 'Loss (0.0)'
                : 'Win (1.0)'}
            </span>
          </div>

          {/* K-Factor */}
          <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-800/80">
            <span className="block text-[11px] font-medium text-slate-400">
              K-Factor Stakes (K)
            </span>
            <span className="mt-1 block text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
              {data.kFactor || 32}
            </span>
          </div>

          {/* Opponent Rating */}
          {data.opponentRatingAverage && (
            <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-800/80">
              <span className="block text-[11px] font-medium text-slate-400">
                Opponent Avg Elo
              </span>
              <span className="mt-1 block text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
                {data.opponentRatingAverage}
              </span>
            </div>
          )}

          {/* Margin of Victory */}
          {data.marginOfVictory && (
            <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-800/80">
              <span className="block text-[11px] font-medium text-slate-400">
                Margin of Victory
              </span>
              <span className="mt-1 block text-lg font-extrabold text-slate-900 dark:text-white">
                {data.marginOfVictory}
              </span>
            </div>
          )}

          {/* Provisional multiplier */}
          {data.provisionalMultiplier && (
            <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-800/80">
              <span className="block text-[11px] font-medium text-slate-400">
                Multiplier
              </span>
              <span className="mt-1 block text-lg font-extrabold text-slate-900 dark:text-white">
                {data.provisionalMultiplier}x
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Formula Calculation Demonstration */}
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-50/50 p-4 font-mono text-xs text-indigo-900 dark:border-indigo-500/30 dark:bg-indigo-950/30 dark:text-indigo-200">
        <div className="flex items-center gap-2 font-bold mb-1">
          <Zap className="h-3.5 w-3.5 text-indigo-500" />
          <span>Calculation: ΔR = K × (S - E)</span>
        </div>
        <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 font-sans mt-1">
          ΔR = {data.kFactor || 32} × (
          {data.actualScore !== undefined ? data.actualScore : 1.0} -{' '}
          {data.expectedScore !== undefined ? data.expectedScore : 0.42}) ={' '}
          {data.delta > 0 ? `+${data.delta}` : data.delta} Elo
        </p>
      </div>

      {/* Explanation Narrative */}
      {data.explanationText && (
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500" />
          <p>{data.explanationText}</p>
        </div>
      )}
    </div>
  );
}

// ─── Subcomponent: Team Balancing Explanation View ('Why these teams?') ───────

function TeamBalancingExplanationView({
  isLoading,
  isError,
  data,
}: {
  isLoading: boolean;
  isError: boolean;
  data?: UnifiedExplanation;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs font-medium text-muted-foreground">
          Fetching team balancing rationale...
        </p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-5 text-center text-xs">
        <Users className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
        <p className="font-semibold text-foreground">
          Team balancing explanation not available yet.
        </p>
        <p className="mt-1 text-muted-foreground">
          Balancing models run once players join and rosters are formed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <span className="text-xs font-bold uppercase tracking-wider text-primary">
          Team Balancing Summary
        </span>
        <p className="mt-1 font-bold text-base text-foreground">{data.summary}</p>
      </div>

      {data.reasons && data.reasons.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Scale className="h-3.5 w-3.5 text-primary" />
            Balancing Objectives
          </h4>
          <ul className="space-y-2">
            {data.reasons.map((r: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                <ChevronRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Target,
  TrendingUp,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronRight,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';
import { useFeatureRecommendations, useJoinGame, queryKeys } from '@playmatch/shared';
import type { RecommendationItem, RecommendationFactor } from '@playmatch/shared/features/recommendations';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { DecisionExplanationModal } from '../../components/explain/DecisionExplanationModal';

// ─── Confidence badge helpers ───────────────────────────────────────────────

const CONFIDENCE_STYLES: Record<
  RecommendationItem['confidence'],
  { bg: string; text: string; ring: string; dot: string; label: string }
> = {
  high: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    ring: 'ring-emerald-500/30',
    dot: 'bg-emerald-400',
    label: 'High',
  },
  medium: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    ring: 'ring-amber-500/30',
    dot: 'bg-amber-400',
    label: 'Medium',
  },
  low: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    ring: 'ring-red-500/30',
    dot: 'bg-red-400',
    label: 'Low',
  },
};

function ConfidenceBadge({ level }: { level: RecommendationItem['confidence'] }) {
  const s = CONFIDENCE_STYLES[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${s.bg} ${s.text} ${s.ring}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label} confidence
    </span>
  );
}

// ─── Circular gauge ─────────────────────────────────────────────────────────

const GAUGE_RADIUS = 54;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

function scoreToColor(score: number): string {
  if (score >= 0.8) return '#10b981'; // emerald-500
  if (score >= 0.6) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
}

function ScoreGauge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const offset = GAUGE_CIRCUMFERENCE * (1 - score);
  const color = scoreToColor(score);

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={136}
        height={136}
        viewBox="0 0 136 136"
        className="transform -rotate-90"
      >
        {/* Background track */}
        <circle
          cx={68}
          cy={68}
          r={GAUGE_RADIUS}
          fill="none"
          stroke="currentColor"
          className="text-white/[0.06]"
          strokeWidth={10}
        />
        {/* Animated progress arc */}
        <circle
          cx={68}
          cy={68}
          r={GAUGE_RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={GAUGE_CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      {/* Centred label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-3xl font-bold tabular-nums tracking-tight"
          style={{ color }}
        >
          {pct}%
        </span>
        <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
          Match
        </span>
      </div>
    </div>
  );
}

// ─── Factor bar ─────────────────────────────────────────────────────────────

function FactorBar({
  name,
  value,
  weight,
}: {
  name: string;
  value: number;
  weight: number;
}) {
  const pct = Math.round(value * 100);
  const barColor =
    pct >= 75
      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
      : pct >= 50
        ? 'bg-gradient-to-r from-amber-500 to-amber-400'
        : 'bg-gradient-to-r from-red-500 to-red-400';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium capitalize text-slate-300">{name}</span>
        <span className="tabular-nums text-slate-500">
          {pct}%{' '}
          <span className="text-slate-600">
            (×{weight.toFixed(1)})
          </span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Single recommendation card ─────────────────────────────────────────────

function RecommendationCard({
  item,
  onExplain,
}: {
  item: RecommendationItem;
  onExplain?: () => void;
}) {
  const navigate = useNavigate();
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const [hasJoined, setHasJoined] = useState(false);

  let toast: (opts: any) => void = () => {};
  try {
    const t = useToast();
    toast = t.toast;
  } catch {
    // If rendered outside ToastProvider
  }

  const joinMutation = useJoinGame(client, item.gameId, {
    onSuccess: (res: any) => {
      const status = res?.status || res?.data?.status;
      if (status === 'requested') {
        toast({
          type: 'info',
          title: 'Join Request Sent',
          description: `Your request to join ${item.title} was sent and is awaiting the host's approval.`,
        });
      } else {
        setHasJoined(true);
        toast({
          type: 'success',
          title: 'Joined Match!',
          description: `You have successfully joined ${item.title}.`,
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.features.recommendations() });
      queryClient.invalidateQueries({ queryKey: queryKeys.games.detail(item.gameId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.games.my() });
    },
    onError: (err: any) => {
      toast({
        type: 'danger',
        title: 'Unable to Join',
        description: err?.message || 'Failed to join game. Please check eligibility requirements.',
      });
    },
  });

  const handleJoin = async () => {
    try {
      await joinMutation.mutateAsync();
    } catch {
      // Handled in onError
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-slate-800/60 to-slate-900/80 p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:shadow-xl hover:shadow-purple-500/5">
      {/* Subtle glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-purple-600/10 blur-3xl transition-opacity duration-500 group-hover:opacity-100 opacity-0" />

      {/* Header: title + confidence */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-100 line-clamp-1">
            {item.title}
          </h3>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-purple-400 ring-1 ring-inset ring-purple-500/20">
            {item.sportKey}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceBadge level={item.confidence} />
          {onExplain && (
            <button
              type="button"
              onClick={onExplain}
              className="inline-flex items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition-colors"
            >
              <Sparkles className="h-3 w-3" />
              Explain
            </button>
          )}
        </div>
      </div>

      {/* Score gauge + factors */}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <ScoreGauge score={item.score} />

        <div className="flex-1 space-y-3 w-full">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Factor Breakdown
          </p>
          {item.factors.map((f: RecommendationFactor) => (
            <FactorBar key={f.name} name={f.name} value={f.value} weight={f.weight} />
          ))}
        </div>
      </div>

      {/* Reasons */}
      {item.reasons.length > 0 && (
        <div className="mt-6 rounded-xl bg-white/[0.03] p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Target className="h-3.5 w-3.5" />
              Why this game?
            </p>
            {onExplain && (
              <button
                type="button"
                onClick={onExplain}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium"
              >
                Deep Dive &rarr;
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {item.reasons.map((reason: string, i: number) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-slate-300"
              >
                <ChevronRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-purple-400" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons: View Game & Join Game */}
      <div className="mt-5 flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
        <button
          type="button"
          onClick={() => navigate(`/games/${item.gameId}`)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.1] hover:text-white"
        >
          View Game
        </button>

        <button
          type="button"
          onClick={handleJoin}
          disabled={hasJoined || joinMutation.isPending}
          className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold transition-all shadow-md ${
            hasJoined
              ? 'bg-emerald-600/20 text-emerald-400 ring-1 ring-inset ring-emerald-500/30 cursor-default'
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-600/25 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60'
          }`}
        >
          {joinMutation.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Joining...</span>
            </>
          ) : hasJoined ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Joined</span>
            </>
          ) : (
            <>
              <UserPlus className="h-3.5 w-3.5" />
              <span>Join Game</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Loading skeleton ───────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/[0.06] bg-slate-800/40 p-6">
      <div className="mb-5 flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-5 w-40 rounded-md bg-white/[0.06]" />
          <div className="h-4 w-20 rounded-md bg-white/[0.06]" />
        </div>
        <div className="h-6 w-28 rounded-full bg-white/[0.06]" />
      </div>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="h-[136px] w-[136px] rounded-full bg-white/[0.06]" />
        <div className="flex-1 space-y-4 w-full">
          {[1, 2, 3].map((n) => (
            <div key={n} className="space-y-1.5">
              <div className="h-3 w-24 rounded bg-white/[0.06]" />
              <div className="h-1.5 w-full rounded-full bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-slate-800/20 py-16 px-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10">
        <Sparkles className="h-8 w-8 text-purple-400" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-slate-200">
        No recommendations yet
      </h3>
      <p className="max-w-sm text-sm text-slate-400">
        Complete your profile and play a few games so our AI can find the best
        matches for you.
      </p>
    </div>
  );
}

// ─── Main export ────────────────────────────────────────────────────────────

export default function RecommendationsTab() {
  const { client } = useAuth();
  const [selectedItem, setSelectedItem] = useState<RecommendationItem | null>(null);
  const { data, isLoading, isError, error, isMock, refetch, isFetching } =
    useFeatureRecommendations(client);

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      {/* Section header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg shadow-purple-600/20">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">
              AI Recommendations
            </h2>
            <p className="text-sm text-slate-400">
              Personalised game suggestions just for you
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isMock && (
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 ring-1 ring-inset ring-amber-500/20">
              Demo Data
            </span>
          )}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3.5 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.1] hover:text-slate-100 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
          <div>
            <p className="font-medium text-red-300">
              Failed to load recommendations
            </p>
            <p className="mt-0.5 text-sm text-red-400/80">
              {error?.message || 'An unexpected error occurred. Please try again.'}
            </p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Data states */}
      {!isLoading && !isError && data && (() => {
        const items = Array.isArray(data.items)
          ? data.items
          : Array.isArray((data as any).data?.items)
          ? (data as any).data.items
          : Array.isArray((data as any).data)
          ? (data as any).data
          : [];

        return (
          <>
            {items.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid gap-5">
                {items.map((item: any) => (
                  <RecommendationCard
                    key={item.gameId}
                    item={item}
                    onExplain={() => setSelectedItem(item)}
                  />
                ))}
              </div>
            )}

            {/* Live updating indicator */}
            {isFetching && !isLoading && (
              <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Updating…
              </div>
            )}
          </>
        );
      })()}

      {/* Explainability Modal */}
      <DecisionExplanationModal
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        mode="game"
        gameData={
          selectedItem
            ? {
                gameTitle: selectedItem.title,
                sportKey: selectedItem.sportKey,
                matchScore: selectedItem.score,
                confidence: selectedItem.confidence,
                factors: selectedItem.factors,
                reasons: selectedItem.reasons,
              }
            : undefined
        }
      />
    </section>
  );
}

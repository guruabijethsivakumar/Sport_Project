import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Calculator,
  TrendingUp,
  Target,
  ShieldCheck,
  Scale,
  Award,
  ChevronRight,
  Info,
  Zap,
} from 'lucide-react';

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

export interface DecisionExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'game' | 'rating';
  gameData?: GameExplanationData;
  ratingData?: RatingExplanationData;
  className?: string;
}

// ─── Default Sample Data ─────────────────────────────────────────────────────

const DEFAULT_GAME_DATA: GameExplanationData = {
  gameTitle: 'Saturday Evening Doubles',
  sportKey: 'badminton',
  matchScore: 0.92,
  confidence: 'high',
  factors: [
    {
      name: 'Skill Compatibility',
      value: 0.95,
      weight: 1.5,
      description: 'Opponents and partner within ±45 Elo of your rating',
    },
    {
      name: 'Geographic Proximity',
      value: 0.88,
      weight: 1.2,
      description: 'Venue located 2.4 km from your primary travel zone',
    },
    {
      name: 'Schedule Alignment',
      value: 0.92,
      weight: 1.0,
      description: 'Matches your regular weekend playing preferences',
    },
    {
      name: 'Host Reliability',
      value: 0.96,
      weight: 1.0,
      description: 'Host holds a 98% attendance and match fulfillment rating',
    },
  ],
  reasons: [
    'Optimal skill bracket: 95% likelihood of a competitive, balanced set',
    'Short travel time: Estimated 8 minutes from your location',
    'Court surface & format match your preferred doubles profile',
  ],
};

const DEFAULT_RATING_DATA: RatingExplanationData = {
  sportKey: 'badminton',
  ratingBefore: 1200,
  ratingAfter: 1218.6,
  delta: 18.6,
  expectedScore: 0.42,
  actualScore: 1.0,
  kFactor: 32,
  opponentRatingAverage: 1245,
  marginOfVictory: '2 - 1 Sets',
  provisionalMultiplier: 1.0,
  explanationText:
    'Because your opponents entered the match with a higher average rating (1,245 vs 1,200), the model predicted a 42% win probability. Securing victory yielded an elevated rating gain of +18.6 points.',
};

export function DecisionExplanationModal({
  isOpen,
  onClose,
  mode: initialMode = 'game',
  gameData = DEFAULT_GAME_DATA,
  ratingData = DEFAULT_RATING_DATA,
  className = '',
}: DecisionExplanationModalProps) {
  const [activeTab, setActiveTab] = useState<'game' | 'rating'>(initialMode);

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

  if (!isOpen) return null;

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
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="explanation-modal-title"
                className="text-lg font-bold text-foreground"
              >
                Decision Explainability
              </h2>
              <p className="text-xs text-muted-foreground">
                Transparent breakdown of matchmaking AI & Elo calculations
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

        {/* Tab Selector */}
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
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'game' ? (
            <GameExplanationView data={gameData} />
          ) : (
            <RatingExplanationView data={ratingData} />
          )}
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

// ─── Subcomponent: Game Explanation View ('Why this game?') ──────────────────

function GameExplanationView({ data }: { data: GameExplanationData }) {
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

function RatingExplanationView({ data }: { data: RatingExplanationData }) {
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

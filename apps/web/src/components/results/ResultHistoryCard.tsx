import React from 'react';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Calendar,
  MapPin,
  ChevronRight,
  Shield,
  Activity,
} from 'lucide-react';

export interface ResultHistoryCardProps {
  gameId?: string;
  sportKey?: string;
  gameTitle?: string;
  date?: string | Date;
  venueName?: string;
  sideAName?: string;
  sideBName?: string;
  sideAScore: number;
  sideBScore: number;
  userSide?: 'side_a' | 'side_b';
  eloDelta: number; // e.g. +16 or -12
  userRatingAfter?: number;
  status?: 'verified' | 'resolved' | 'disputed' | 'voided';
  notes?: string;
  onClick?: () => void;
  className?: string;
}

export function ResultHistoryCard({
  gameId,
  sportKey = 'match',
  gameTitle,
  date,
  venueName,
  sideAName = 'Side A',
  sideBName = 'Side B',
  sideAScore,
  sideBScore,
  userSide = 'side_a',
  eloDelta,
  userRatingAfter,
  status = 'verified',
  notes,
  onClick,
  className = '',
}: ResultHistoryCardProps) {
  const isPositiveElo = eloDelta > 0;
  const isNegativeElo = eloDelta < 0;
  const isZeroElo = eloDelta === 0;

  const isAWinner = sideAScore > sideBScore;
  const isBWinner = sideBScore > sideAScore;

  const userWon =
    (userSide === 'side_a' && isAWinner) || (userSide === 'side_b' && isBWinner);

  // Format date string
  const formattedDate = date
    ? typeof date === 'string'
      ? new Date(date).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
    : null;

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-2xs transition-all duration-200 dark:border-slate-800 dark:bg-slate-900/80 ${
        onClick
          ? 'cursor-pointer hover:border-slate-300 hover:shadow-md dark:hover:border-slate-700'
          : ''
      } ${className}`}
    >
      {/* Top Header: Sport tag, date, verified status */}
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {sportKey && (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {sportKey}
            </span>
          )}
          {gameTitle && (
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[140px] sm:max-w-[200px]">
              {gameTitle}
            </span>
          )}
          {formattedDate && (
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <Calendar className="h-3 w-3" />
              {formattedDate}
            </span>
          )}
        </div>

        {/* Status chip */}
        <div className="flex items-center gap-1.5">
          {status === 'verified' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Verified
            </span>
          ) : status === 'resolved' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-600 ring-1 ring-inset ring-blue-500/20 dark:text-blue-400">
              Resolved
            </span>
          ) : status === 'disputed' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400">
              Disputed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-500/20">
              {status}
            </span>
          )}
        </div>
      </div>

      {/* Main Scoreboard Row */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/80 dark:bg-slate-800/40">
        {/* Side A */}
        <div className="flex flex-1 items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Shield className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
            <span
              className={`text-xs font-bold truncate ${
                isAWinner
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {sideAName}
            </span>
            {userSide === 'side_a' && (
              <span className="rounded bg-blue-500/10 px-1 py-0.2 text-[9px] font-extrabold uppercase text-blue-600 ring-1 ring-blue-500/20 dark:text-blue-400">
                You
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span
              className={`text-lg font-black tabular-nums ${
                isAWinner
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {sideAScore}
            </span>
            {isAWinner && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
          </div>
        </div>

        {/* Divider */}
        <div className="text-xs font-bold text-slate-300 dark:text-slate-600">vs</div>

        {/* Side B */}
        <div className="flex flex-1 items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {isBWinner && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
            <span
              className={`text-lg font-black tabular-nums ${
                isBWinner
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {sideBScore}
            </span>
          </div>
          <div className="flex items-center justify-end gap-1.5 min-w-0 text-right">
            {userSide === 'side_b' && (
              <span className="rounded bg-purple-500/10 px-1 py-0.2 text-[9px] font-extrabold uppercase text-purple-600 ring-1 ring-purple-500/20 dark:text-purple-400">
                You
              </span>
            )}
            <span
              className={`text-xs font-bold truncate ${
                isBWinner
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {sideBName}
            </span>
            <Shield className="h-3.5 w-3.5 flex-shrink-0 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Footer: Elo Delta Badge + New Rating info */}
      <div className="mt-3.5 flex items-center justify-between text-xs">
        {/* Venue tag or match outcome */}
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          {venueName ? (
            <span className="flex items-center gap-1 text-[11px] truncate max-w-[160px]">
              <MapPin className="h-3 w-3 flex-shrink-0 text-slate-400" />
              {venueName}
            </span>
          ) : (
            <span className="text-[11px] font-medium text-slate-500">
              {userWon ? 'Victory' : isAWinner === isBWinner ? 'Draw' : 'Defeat'}
            </span>
          )}
        </div>

        {/* Elo Delta Indicator */}
        <div className="flex items-center gap-2">
          {userRatingAfter !== undefined && (
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              New: <span className="font-bold text-slate-700 dark:text-slate-300">{userRatingAfter}</span>
            </span>
          )}

          {/* Elo Badge (+16 green / -12 red) */}
          <div
            className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-black tabular-nums ring-1 ring-inset ${
              isPositiveElo
                ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400'
                : isNegativeElo
                  ? 'bg-rose-500/10 text-rose-600 ring-rose-500/30 dark:bg-rose-500/15 dark:text-rose-400'
                  : 'bg-slate-500/10 text-slate-600 ring-slate-500/30 dark:text-slate-400'
            }`}
          >
            {isPositiveElo ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
            ) : isNegativeElo ? (
              <TrendingDown className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            <span>
              {isPositiveElo ? `+${eloDelta}` : eloDelta} Elo
            </span>
          </div>

          {onClick && (
            <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
          )}
        </div>
      </div>
    </div>
  );
}

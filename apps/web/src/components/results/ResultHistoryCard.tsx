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
      className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all duration-200 ${
        onClick
          ? 'cursor-pointer hover:border-primary/40 hover:shadow-md'
          : ''
      } ${className}`}
    >
      {/* Top Header: Sport tag, date, verified status */}
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {sportKey && (
            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-foreground">
              {sportKey}
            </span>
          )}
          {gameTitle && (
            <span className="text-xs font-semibold text-foreground truncate max-w-[140px] sm:max-w-[200px]">
              {gameTitle}
            </span>
          )}
          {formattedDate && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formattedDate}
            </span>
          )}
        </div>

        {/* Status chip */}
        <div className="flex items-center gap-1.5">
          {status === 'verified' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success ring-1 ring-inset ring-success/20">
              <CheckCircle2 className="h-3 w-3" />
              Verified
            </span>
          ) : status === 'resolved' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-2 py-0.5 text-[11px] font-semibold text-info ring-1 ring-inset ring-info/20">
              Resolved
            </span>
          ) : status === 'disputed' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning ring-1 ring-inset ring-warning/20">
              Disputed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-inset ring-border">
              {status}
            </span>
          )}
        </div>
      </div>

      {/* Main Scoreboard Row */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 p-3">
        {/* Side A */}
        <div className="flex flex-1 items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Shield className="h-3.5 w-3.5 flex-shrink-0 text-info" />
            <span
              className={`text-xs font-bold truncate ${
                isAWinner
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {sideAName}
            </span>
            {userSide === 'side_a' && (
              <span className="rounded bg-info/15 px-1 py-0.2 text-[9px] font-extrabold uppercase text-info ring-1 ring-info/30">
                You
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span
              className={`text-lg font-black tabular-nums ${
                isAWinner
                  ? 'text-info'
                  : 'text-foreground'
              }`}
            >
              {sideAScore}
            </span>
            {isAWinner && <Trophy className="h-3.5 w-3.5 text-warning" />}
          </div>
        </div>

        {/* Divider */}
        <div className="text-xs font-bold text-muted-foreground">vs</div>

        {/* Side B */}
        <div className="flex flex-1 items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {isBWinner && <Trophy className="h-3.5 w-3.5 text-warning" />}
            <span
              className={`text-lg font-black tabular-nums ${
                isBWinner
                  ? 'text-primary'
                  : 'text-foreground'
              }`}
            >
              {sideBScore}
            </span>
          </div>
          <div className="flex items-center justify-end gap-1.5 min-w-0 text-right">
            {userSide === 'side_b' && (
              <span className="rounded bg-primary/15 px-1 py-0.2 text-[9px] font-extrabold uppercase text-primary ring-1 ring-primary/30">
                You
              </span>
            )}
            <span
              className={`text-xs font-bold truncate ${
                isBWinner
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {sideBName}
            </span>
            <Shield className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
          </div>
        </div>
      </div>

      {/* Footer: Elo Delta Badge + New Rating info */}
      <div className="mt-3.5 flex items-center justify-between text-xs">
        {/* Venue tag or match outcome */}
        <div className="flex items-center gap-2 text-muted-foreground">
          {venueName ? (
            <span className="flex items-center gap-1 text-[11px] truncate max-w-[160px]">
              <MapPin className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
              {venueName}
            </span>
          ) : (
            <span className="text-[11px] font-medium text-muted-foreground">
              {userWon ? 'Victory' : isAWinner === isBWinner ? 'Draw' : 'Defeat'}
            </span>
          )}
        </div>

        {/* Elo Delta Indicator */}
        <div className="flex items-center gap-2">
          {userRatingAfter !== undefined && (
            <span className="text-[11px] font-medium text-muted-foreground">
              New: <span className="font-bold text-foreground">{userRatingAfter}</span>
            </span>
          )}

          {/* Elo Badge (+16 green / -12 red) */}
          <div
            className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-black tabular-nums ring-1 ring-inset ${
              isPositiveElo
                ? 'bg-success/15 text-success ring-success/30'
                : isNegativeElo
                  ? 'bg-danger/15 text-danger ring-danger/30'
                  : 'bg-muted text-muted-foreground ring-border'
            }`}
          >
            {isPositiveElo ? (
              <TrendingUp className="h-3.5 w-3.5 text-success" />
            ) : isNegativeElo ? (
              <TrendingDown className="h-3.5 w-3.5 text-danger" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            <span>
              {isPositiveElo ? `+${eloDelta}` : eloDelta} Elo
            </span>
          </div>

          {onClick && (
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          )}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Badge, StatusBadge, type GameStatusType } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { getGameSportImage } from '../../utils/sports-images';

export interface GameLocation {
  type?: string;
  coordinates?: number[];
  addressName?: string;
}

export interface ConfirmedResultSummary {
  status: string;
  winnerSideKey?: string;
  winnerLabel?: string;
  scoreSummary?: string;
  scores?: Array<{ sideKey: string; score: number; winner: boolean }>;
}

export interface DiscoveredGameData {
  _id?: string;
  id?: string;
  sportKey: string;
  formatKey?: string;
  status: GameStatusType;
  joinPolicy?: 'open' | 'approval';
  minPlayers?: number;
  maxPlayers: number;
  participantCount: number;
  waitlistCount?: number;
  startsAt: string;
  endsAt?: string;
  notes?: string;
  venueName?: string;
  venueAreaLabel?: string;
  courtName?: string;
  location?: GameLocation;
  resultStatus?: string;
  confirmedResult?: ConfirmedResultSummary;
}

export interface MatchSignals {
  distanceKm?: number;
  ratingGap?: number | null;
  ratingInRange?: boolean;
  availabilityFit?: boolean;
  travelRadiusFit?: boolean;
  hostRating?: number | null;
  seatsLeft?: number;
}

export interface GameCardProps {
  game: DiscoveredGameData;
  distanceKm?: number;
  matchSignals?: MatchSignals;
  from?: 'my_games' | 'discover';
  className?: string;
}

function formatSportName(sportKey: string): string {
  if (!sportKey) return 'Sport';
  return sportKey.charAt(0).toUpperCase() + sportKey.slice(1);
}

function formatFormatName(formatKey?: string): string {
  if (!formatKey) return '';
  return formatKey
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatGameDateTime(isoDateString: string): { dateStr: string; timeStr: string } {
  try {
    const d = new Date(isoDateString);
    if (isNaN(d.getTime())) {
      return { dateStr: 'Upcoming', timeStr: '' };
    }
    const dateStr = d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const timeStr = d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
    return { dateStr, timeStr };
  } catch {
    return { dateStr: 'Upcoming', timeStr: '' };
  }
}

export function GameCard({
  game,
  distanceKm,
  matchSignals,
  from,
  className = '',
}: GameCardProps): React.ReactElement {
  const gameId = game._id || game.id || '';
  const { dateStr, timeStr } = formatGameDateTime(game.startsAt);
  const seatsLeft = matchSignals?.seatsLeft ?? Math.max(0, game.maxPlayers - game.participantCount);
  const isFull = game.status === 'full' || seatsLeft <= 0;
  const gamePhoto = getGameSportImage(game.sportKey, gameId);

  // Resolve location title: venue name first, address name second, or generic area fallback
  const locationLabel =
    game.venueName ||
    game.location?.addressName ||
    game.venueAreaLabel ||
    'Community Court';

  const displayedDistance =
    distanceKm !== undefined
      ? `${distanceKm} km away`
      : matchSignals?.distanceKm !== undefined
      ? `${matchSignals.distanceKm} km away`
      : null;

  const targetLink = from === 'my_games' ? `/games/${gameId}?from=my_games` : `/games/${gameId}`;

  return (
    <Card
      className={`group flex flex-col justify-between overflow-hidden transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 ${className}`}
      data-testid="game-card"
    >
      <div>
        {/* Top Image Banner: Sport Photo & Badges */}
        <div className="relative h-36 w-full overflow-hidden bg-muted">
          <img
            src={gamePhoto}
            alt={game.sportKey}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40" />

          {/* Top floating chips */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 z-10">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-xs border border-white/20">
                {formatSportName(game.sportKey)}
              </span>
              {game.formatKey && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-black/40 text-white/90 backdrop-blur-xs border border-white/10">
                  {formatFormatName(game.formatKey)}
                </span>
              )}
            </div>
            <StatusBadge status={game.status} />
          </div>

          {/* Confirmed Winner Pill on Photo if verified */}
          {game.confirmedResult && (
            <div className="absolute bottom-2 left-2.5 right-2.5 z-10 flex items-center justify-between px-2.5 py-1 rounded-md bg-emerald-950/85 backdrop-blur-xs border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-xs">
              <span className="flex items-center gap-1.5 truncate">
                <Icon name="trophy" size={13} className="text-warning shrink-0" />
                <span className="truncate">Winner: {game.confirmedResult.winnerLabel}</span>
              </span>
              {game.confirmedResult.scoreSummary && (
                <span className="font-mono font-bold text-white shrink-0 ml-2">
                  {game.confirmedResult.scoreSummary}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Card Body */}
        <div className="p-4">
          {/* Notes / Title snippet */}
          {game.notes ? (
            <p className="text-sm text-foreground/90 font-medium line-clamp-1 mb-3">
              {game.notes}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic mb-2">
              Match scheduled at {locationLabel}
            </p>
          )}

          {/* Join Policy tag if approval required */}
          {game.joinPolicy === 'approval' && (
            <div className="mb-3">
              <Badge variant="outline" className="text-xs">
                Request to join
              </Badge>
            </div>
          )}

          {/* Details: Date, Time, Venue/Location */}
          <div className="space-y-2 text-xs text-muted-foreground mb-2">
            <div className="flex items-center gap-2">
              <Icon name="calendar" size={14} className="text-primary shrink-0" />
              <span className="font-medium text-foreground">{dateStr}</span>
              {timeStr && <span>• {timeStr}</span>}
            </div>

            <div className="flex items-center gap-2">
              <Icon name="map-pin" size={14} className="text-primary shrink-0" />
              <span className="truncate max-w-[200px]" title={locationLabel}>
                {locationLabel}
              </span>
              {displayedDistance && (
                <span className="text-xs text-muted-foreground shrink-0 font-mono">
                  ({displayedDistance})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Icon name="users" size={14} className="text-primary shrink-0" />
              <span>
                {game.participantCount} / {game.maxPlayers} players
                {isFull ? (
                  <span className="ml-1 text-danger font-medium">(Full)</span>
                ) : (
                  <span className="ml-1 text-success font-medium">({seatsLeft} open)</span>
                )}
              </span>
              {game.waitlistCount && game.waitlistCount > 0 ? (
                <span className="text-muted-foreground">• {game.waitlistCount} waitlisted</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Footer: View Details CTA */}
      <div className="px-4 pb-4 pt-2 border-t border-border-subtle/50 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {matchSignals?.ratingInRange === false ? (
            <span className="text-amber-500 font-medium">Rating gap</span>
          ) : matchSignals?.availabilityFit ? (
            <span className="text-success font-medium flex items-center gap-1">
              <Icon name="check" size={12} /> Schedule match
            </span>
          ) : null}
        </div>

        <Link to={targetLink} state={{ from }}>
          <Button size="sm" variant="outline" rightIcon="chevron-right">
            View Game
          </Button>
        </Link>
      </div>
    </Card>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Badge, StatusBadge, type GameStatusType } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

export interface GameLocation {
  type?: string;
  coordinates?: number[];
  addressName?: string;
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
  className = '',
}: GameCardProps): React.ReactElement {
  const gameId = game._id || game.id || '';
  const { dateStr, timeStr } = formatGameDateTime(game.startsAt);
  const seatsLeft = matchSignals?.seatsLeft ?? Math.max(0, game.maxPlayers - game.participantCount);
  const isFull = game.status === 'full' || seatsLeft <= 0;

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

  return (
    <Card
      className={`flex flex-col justify-between overflow-hidden transition-all hover:border-primary/40 hover:shadow-md ${className}`}
      data-testid="game-card"
    >
      <div>
        {/* Header: Sport & Status */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-base text-foreground tracking-tight">
              {formatSportName(game.sportKey)}
            </span>
            {game.formatKey && (
              <Badge variant="secondary" className="font-normal text-xs">
                {formatFormatName(game.formatKey)}
              </Badge>
            )}
            {game.joinPolicy === 'approval' && (
              <Badge variant="outline" className="text-xs">
                Request to join
              </Badge>
            )}
          </div>
          <StatusBadge status={game.status} />
        </div>

        {/* Notes / Title snippet */}
        {game.notes && (
          <p className="text-sm text-foreground/90 font-medium line-clamp-1 mb-3">
            {game.notes}
          </p>
        )}

        {/* Details: Date, Time, Venue/Location */}
        <div className="space-y-2 text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <Icon name="calendar" size={14} className="text-primary shrink-0" />
            <span className="font-medium text-foreground">{dateStr}</span>
            {timeStr && <span>• {timeStr}</span>}
          </div>

          <div className="flex items-center gap-2">
            <Icon name="map-pin" size={14} className="text-primary shrink-0" />
            <span className="truncate max-w-[220px]" title={locationLabel}>
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

      {/* Footer: View Details CTA */}
      <div className="pt-3 border-t border-border-subtle/50 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {matchSignals?.ratingInRange === false ? (
            <span className="text-amber-500 font-medium">Rating gap</span>
          ) : matchSignals?.availabilityFit ? (
            <span className="text-success font-medium flex items-center gap-1">
              <Icon name="check" size={12} /> Schedule match
            </span>
          ) : null}
        </div>

        <Link to={`/games/${gameId}`}>
          <Button size="sm" variant="outline" rightIcon="chevron-right">
            View Game
          </Button>
        </Link>
      </div>
    </Card>
  );
}

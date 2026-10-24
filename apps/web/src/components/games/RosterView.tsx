import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { cn } from '../../lib/utils';


export interface RosterMember {
  userId: string;
  name: string;
  avatarUrl?: string;
  role: string;
  status: string;
  joinedAt?: string | Date;
  rating?: number;
}

export interface GameRoster {
  gameId: string;
  sportKey: string;
  formatKey: string;
  minPlayers: number;
  maxPlayers: number;
  participantCount: number;
  joined: RosterMember[];
  requested: RosterMember[];
  waitlisted: RosterMember[];
}

export interface RosterViewProps {
  roster?: GameRoster;
  isLoading?: boolean;
  isHost?: boolean;
  currentUserId?: string;
  onApprove?: (userId: string) => void | Promise<void>;
  onDecline?: (userId: string) => void | Promise<void>;
  onRemove?: (userId: string) => void | Promise<void>;
  onViewProfile?: (userId: string) => void;
  isActionLoading?: boolean;
}


export function RosterView({
  roster,
  isLoading = false,
  isHost = false,
  currentUserId,
  onApprove,
  onDecline,
  onRemove,
  onViewProfile,
  isActionLoading = false,
}: RosterViewProps): React.ReactElement {

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-5 w-20" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <Skeleton shape="circle" className="h-10 w-10" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const joined = roster?.joined || [];
  const requested = roster?.requested || [];
  const waitlisted = roster?.waitlisted || [];
  const maxPlayers = roster?.maxPlayers || joined.length;
  const isFull = maxPlayers > 0 && joined.length >= maxPlayers;

  return (
    <div className="space-y-6">
      {/* 1. Pending Join Requests Section (Host only) */}
      {isHost && requested.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="user-plus" className="text-warning" size={18} />
                <CardTitle className="text-base text-warning">
                  Pending Join Requests ({requested.length})
                </CardTitle>
              </div>
              <Badge variant="warning">Host Action Required</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {requested.map((req) => (
              <div
                key={req.userId}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border border-warning/20 bg-card gap-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    src={req.avatarUrl}
                    alt={req.name}
                    fallbackText={req.name}
                    size="md"
                  />
                  <div>
                    <p className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                      {req.name}
                      {req.userId === currentUserId && (
                        <span className="text-xs text-muted-foreground font-normal">(You)</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {req.rating !== undefined && (
                        <span className="font-medium text-foreground/80">
                          {req.rating} Elo
                        </span>
                      )}
                      <span>• Awaiting your decision</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    leftIcon="check"
                    disabled={isActionLoading}
                    onClick={() => onApprove?.(req.userId)}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon="x"
                    disabled={isActionLoading}
                    onClick={() => onDecline?.(req.userId)}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 2. Confirmed Roster Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <span>Confirmed Roster</span>
                <span className="text-sm font-normal text-muted-foreground">
                  ({joined.length} / {maxPlayers} Players)
                </span>
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isFull ? 'danger' : 'success'}>
                {isFull ? 'Roster Full' : `${Math.max(0, maxPlayers - joined.length)} spots left`}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {joined.length === 0 ? (
            <EmptyState
              icon="users"
              title="No Players Yet"
              description="No participants have confirmed for this match yet."
            />
          ) : (
            <div className="divide-y divide-border-subtle/50">
              {joined.map((player) => {
                const isPlayerHost = player.role === 'host';
                const isCurrent = player.userId === currentUserId;

                return (
                  <div
                    key={player.userId}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={onViewProfile ? 'cursor-pointer hover:opacity-80 transition-opacity' : undefined}
                        onClick={() => onViewProfile?.(player.userId)}
                        role={onViewProfile ? 'button' : undefined}
                        tabIndex={onViewProfile ? 0 : undefined}
                        aria-label={`View profile for ${player.name}`}
                      >
                        <Avatar
                          src={player.avatarUrl}
                          alt={player.name}
                          fallbackText={player.name}
                          size="md"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className={cn(
                              'text-sm font-semibold text-foreground text-left',
                              onViewProfile && 'hover:text-primary transition-colors cursor-pointer'
                            )}
                            onClick={() => onViewProfile?.(player.userId)}
                          >
                            {player.name}
                          </button>
                          {isCurrent && (
                            <span className="text-xs text-primary font-medium">(You)</span>
                          )}
                          {isPlayerHost && (
                            <Badge variant="default" className="text-[10px] px-2 py-0">
                              Host
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {player.rating !== undefined ? (
                            <span className="font-medium text-foreground/80">
                              {player.rating} Elo
                            </span>
                          ) : (
                            <span>Unrated</span>
                          )}
                          {player.joinedAt && (
                            <span>
                              • Joined {new Date(player.joinedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isHost && !isPlayerHost && onRemove && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:text-danger hover:bg-danger/10 text-xs h-8 px-2"
                          disabled={isActionLoading}
                          onClick={() => onRemove(player.userId)}
                          title="Remove player from match"
                        >
                          <Icon name="x" size={14} className="mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Waitlist Section */}
      {waitlisted.length > 0 && (
        <Card className="border-border-subtle/80 bg-muted/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-foreground flex items-center gap-2">
                <Icon name="clock" size={16} className="text-muted-foreground" />
                Waitlist Queue ({waitlisted.length})
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                Auto-promotes if a confirmed player leaves
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border-subtle/40">
              {waitlisted.map((wPlayer, idx) => (
                <div
                  key={wPlayer.userId}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-muted-foreground w-5 text-center">
                      #{idx + 1}
                    </span>
                    <Avatar
                      src={wPlayer.avatarUrl}
                      alt={wPlayer.name}
                      fallbackText={wPlayer.name}
                      size="sm"
                    />
                    <div>
                      <span className="text-xs font-medium text-foreground">
                        {wPlayer.name}
                      </span>
                      {wPlayer.userId === currentUserId && (
                        <span className="ml-1 text-xs text-primary">(You)</span>
                      )}
                    </div>
                  </div>
                  {wPlayer.rating !== undefined && (
                    <span className="text-xs text-muted-foreground font-mono">
                      {wPlayer.rating} Elo
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

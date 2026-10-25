import React, { useState } from 'react';
import { useGameTimeline, type GameTimelineEvent } from '@playmatch/shared';
import { useAuth, sharedApiClient } from '../../auth/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Icon, type IconName } from '../ui/Icon';

export interface GameTimelineCardProps {
  gameId: string;
  gameStatus?: string;
  hasPendingResult?: boolean;
  participantCount?: number;
  className?: string;
}

interface ProgressionStep {
  id: string;
  label: string;
  description: string;
  iconName: IconName;
  status: 'completed' | 'current' | 'pending';
  timestamp?: string;
}

export function GameTimelineCard({
  gameId,
  gameStatus = 'open',
  hasPendingResult = false,
  participantCount = 0,
  className = '',
}: GameTimelineCardProps) {
  const auth = useAuth?.();
  const client = auth?.client || sharedApiClient;

  const [isFeedExpanded, setIsFeedExpanded] = useState(false);

  const {
    data: timelineEvents = [],
    isLoading,
    isRefetching,
    refetch,
  } = useGameTimeline(client, gameId, {
    enabled: Boolean(gameId),
    refetchInterval: 30000, // Background refresh every 30s
  });

  const events: GameTimelineEvent[] = Array.isArray(timelineEvents) ? timelineEvents : [];

  // Determine which progression milestones have occurred
  const hasCreated = events.some((e) => e.type === 'game_created') || true;
  const hasJoined =
    events.some((e) => e.type === 'participant_joined' || e.type === 'participant_approved') ||
    participantCount > 0;
  const hasTeamsBalanced =
    events.some((e) => e.type === 'teams_generated') ||
    gameStatus === 'in_progress' ||
    gameStatus === 'completed';
  const hasScoreProposed =
    events.some((e) => e.type === 'game.result_submitted') ||
    hasPendingResult ||
    gameStatus === 'completed';
  const hasVerified =
    events.some((e) => e.type === 'game.result_verified') || gameStatus === 'completed';

  // Find timestamps for completed milestones
  const createdTimestamp = events.find((e) => e.type === 'game_created')?.createdAt;
  const joinedTimestamp = events
    .filter((e) => e.type === 'participant_joined' || e.type === 'participant_approved')
    .slice(-1)[0]?.createdAt;
  const teamsTimestamp = events.find((e) => e.type === 'teams_generated')?.createdAt;
  const scoreTimestamp = events.find((e) => e.type === 'game.result_submitted')?.createdAt;
  const verifiedTimestamp = events.find((e) => e.type === 'game.result_verified')?.createdAt;

  // Build the 5-stage visual progression pipeline
  const steps: ProgressionStep[] = [
    {
      id: 'created',
      label: 'Created',
      description: 'Match set up & published',
      iconName: 'sparkles',
      status: 'completed',
      timestamp: createdTimestamp,
    },
    {
      id: 'joined',
      label: 'Joined',
      description: 'Players entered roster',
      iconName: 'users',
      status: hasJoined
        ? hasTeamsBalanced
          ? 'completed'
          : 'current'
        : 'current',
      timestamp: joinedTimestamp,
    },
    {
      id: 'teams',
      label: 'Teams Balanced',
      description: 'Elo balanced lineups formed',
      iconName: 'scale',
      status: hasTeamsBalanced
        ? hasScoreProposed
          ? 'completed'
          : 'current'
        : 'pending',
      timestamp: teamsTimestamp,
    },
    {
      id: 'score',
      label: 'Score Proposed',
      description: 'Result submitted for review',
      iconName: 'file-check',
      status: hasScoreProposed
        ? hasVerified
          ? 'completed'
          : 'current'
        : 'pending',
      timestamp: scoreTimestamp,
    },
    {
      id: 'verified',
      label: 'Verified',
      description: 'Confirmed & Elo applied',
      iconName: 'award',
      status: hasVerified ? 'completed' : 'pending',
      timestamp: verifiedTimestamp,
    },
  ];

  return (
    <Card className={`border-border-subtle bg-card text-card-foreground shadow-xs overflow-hidden ${className}`}>
      {/* Header */}
      <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon name="activity" size={16} />
            </div>
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                Match Activity Timeline
                {isRefetching && (
                  <span className="text-[10px] text-muted-foreground animate-pulse font-normal">
                    (syncing...)
                  </span>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Lifecycle milestones & audit trail
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
            title="Refresh timeline events"
          >
            <Icon name="refresh" size={14} className={isRefetching ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* ─── 5-Step Visual Progression Stepper ──────────────────────────── */}
        <div className="relative">
          <div className="grid grid-cols-5 gap-1 sm:gap-2 relative">
            {/* Background connecting track */}
            <div className="absolute top-4 left-[10%] right-[10%] h-0.5 bg-border -z-0 hidden sm:block" />

            {steps.map((step) => {
              const isCompleted = step.status === 'completed';
              const isCurrent = step.status === 'current';

              return (
                <div
                  key={step.id}
                  className="relative z-10 flex flex-col items-center text-center group"
                >
                  {/* Step Icon Node */}
                  <div
                    className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border-2 transition-all ${
                      isCompleted
                        ? 'border-success bg-success text-success-foreground shadow-xs'
                        : isCurrent
                          ? 'border-primary bg-primary/10 text-primary animate-pulse ring-4 ring-primary/20'
                          : 'border-border bg-card text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <Icon name="check-circle" size={15} />
                    ) : (
                      <Icon name={step.iconName} size={14} />
                    )}
                  </div>

                  {/* Step Label */}
                  <div className="mt-1.5">
                    <span
                      className={`text-[11px] font-bold leading-tight block ${
                        isCompleted
                          ? 'text-foreground'
                          : isCurrent
                            ? 'text-primary font-black'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="text-[9px] text-muted-foreground hidden xl:block mt-0.5 max-w-[80px] mx-auto leading-tight">
                      {step.description}
                    </span>
                    {step.timestamp && (
                      <span className="text-[9px] font-mono text-muted-foreground/80 mt-0.5 block">
                        {new Date(step.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Live Chronological Audit Log Feed ──────────────────────────── */}
        <div className="pt-2 border-t border-border/40">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Icon name="clock" size={14} />
              Recorded Match Events ({events.length})
            </h4>

            {events.length > 3 && (
              <button
                type="button"
                onClick={() => setIsFeedExpanded(!isFeedExpanded)}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
              >
                <span>{isFeedExpanded ? 'Show Recent Only' : 'View Full Audit Trail'}</span>
                <Icon name={isFeedExpanded ? 'chevron-up' : 'chevron-down'} size={14} />
              </button>
            )}
          </div>

          {events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Match initialized. As players register, teams balance, and scores are verified, event audit entries will populate here.
            </div>
          ) : (
            <div className="space-y-2">
              {(isFeedExpanded ? [...events].reverse() : [...events].reverse().slice(0, 3)).map(
                (event, i) => {
                  const meta = formatEventMetadata(event);
                  return (
                    <div
                      key={event.id || event._id || i}
                      className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5 text-xs transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`h-2 w-2 rounded-full ${meta.dotColor}`} />
                        <div>
                          <span className="font-semibold text-foreground mr-2">
                            {meta.title}
                          </span>
                          {meta.subtitle && (
                            <span className="text-muted-foreground text-[11px]">
                              {meta.subtitle}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="text-[11px] font-mono text-muted-foreground shrink-0 ml-2">
                        {event.createdAt ? formatEventTime(event.createdAt) : ''}
                      </span>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Helper: Format Event Types & Visual Badges ──────────────────────────────

function formatEventMetadata(event: GameTimelineEvent): {
  title: string;
  subtitle?: string;
  dotColor: string;
} {
  switch (event.type) {
    case 'game_created':
      return {
        title: 'Match Created',
        subtitle: 'Game opened for registration',
        dotColor: 'bg-primary',
      };
    case 'participant_joined':
      return {
        title: 'Player Joined',
        subtitle: event.payload?.displayName || 'Registered to match roster',
        dotColor: 'bg-success',
      };
    case 'participant_approved':
      return {
        title: 'Join Request Approved',
        subtitle: 'Host confirmed participant',
        dotColor: 'bg-success',
      };
    case 'participant_left':
      return {
        title: 'Player Withdrew',
        subtitle: 'Slot reopened to community',
        dotColor: 'bg-warning',
      };
    case 'teams_generated':
      return {
        title: 'Teams Balanced',
        subtitle: event.payload?.difference !== undefined
          ? `Balanced (gap: ${event.payload.difference} Elo)`
          : 'Lineups formed via Elo engine',
        dotColor: 'bg-info',
      };
    case 'game.result_submitted':
      return {
        title: 'Score Proposed',
        subtitle: 'Result submitted awaiting opponent verification',
        dotColor: 'bg-warning',
      };
    case 'game.result_verified':
      return {
        title: 'Result Verified',
        subtitle: 'Ratings updated & ledger finalized',
        dotColor: 'bg-success',
      };
    case 'game.result_disputed':
      return {
        title: 'Result Disputed',
        subtitle: 'Discrepancy flagged for moderator review',
        dotColor: 'bg-danger',
      };
    case 'game_cancelled':
      return {
        title: 'Match Cancelled',
        subtitle: 'Game removed by organizer',
        dotColor: 'bg-danger',
      };
    default:
      return {
        title: event.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        subtitle: event.payload?.reason || '',
        dotColor: 'bg-muted-foreground',
      };
  }
}

function formatEventTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

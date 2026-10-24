import React, { useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  useGameDetail,
  useGameRoster,
  useSportsCatalog,
  useJoinGame,
  useLeaveGame,
  useCancelGame,
  useApproveParticipant,
  useDeclineParticipant,
  useRemoveParticipant,
  useFeatureGameResult,
  useUpdateGame,
} from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge, StatusBadge, type GameStatusType } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Icon } from '../../components/ui/Icon';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { ConfirmDialog } from '../../components/ui/Dialog';
import { useToast } from '../../components/ui/Toast';
import { RosterView } from '../../components/games/RosterView';
import { HostControls } from '../../components/games/HostControls';
import { GameTeamsSlot } from '../../components/slots/GameTeamsSlot';
import { GameResultSlot } from '../../components/slots/GameResultSlot';
import { AttendanceFeedbackModal } from '../../components/games/AttendanceFeedbackModal';
import { PlayerProfileModal } from '../../components/profile/PlayerProfileModal';
import { GameTimelineCard } from '../../components/games/GameTimelineCard';
import { MatchStakesCard } from '../../components/games/MatchStakesCard';
import { DecisionExplanationModal, type ExplanationModalMode } from '../../components/explain';


export function GameDetailsPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { client, user } = useAuth();
  const { toast } = useToast();

  const inviteCodeParam = searchParams.get('code') || searchParams.get('inviteCode') || '';
  const [manualCode, setManualCode] = useState('');

  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [removeParticipantId, setRemoveParticipantId] = useState<string | null>(null);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [explainModalOpen, setExplainModalOpen] = useState(false);
  const [explainModalMode, setExplainModalMode] = useState<ExplanationModalMode>('eligibility');

  // Queries
  const {
    data: gameData,
    isLoading: isGameLoading,
    isError: isGameError,
    error: gameError,
    refetch: refetchGame,
  } = useGameDetail(client, id || '', undefined, inviteCodeParam || undefined);

  const {
    data: rosterData,
    isLoading: isRosterLoading,
    refetch: refetchRoster,
  } = useGameRoster(client, id || '');

  const { data: sportsData } = useSportsCatalog(client);

  const { data: resultData } = useFeatureGameResult(client, id || '', {
    enabled: Boolean(id),
  });

  // Mutations
  const joinMutation = useJoinGame(client, id || '');
  const leaveMutation = useLeaveGame(client, id || '');
  const cancelMutation = useCancelGame(client, id || '');
  const approveMutation = useApproveParticipant(client, id || '');
  const declineMutation = useDeclineParticipant(client, id || '');
  const removeMutation = useRemoveParticipant(client, id || '');
  const updateGameMutation = useUpdateGame(client, id || '');

  const game = (gameData as any)?.data || gameData;
  const roster = (rosterData as any)?.data || rosterData;

  // Resolve sport & format metadata
  const sportsList: any[] = sportsData?.sports || [];
  const currentSport = sportsList.find((s) => s.key === game?.sportKey);
  const currentFormat = currentSport?.formats?.find((f: any) => f.key === game?.formatKey);

  // Current user & role resolution
  const currentUserId = user?.id || (user as any)?._id;
  const hostId = typeof game?.hostId === 'object' ? game?.hostId?.id || game?.hostId?._id : game?.hostId;
  const isHost = Boolean(currentUserId && hostId && String(currentUserId) === String(hostId));

  const joinedList: any[] = roster?.joined || [];
  const requestedList: any[] = roster?.requested || [];
  const waitlistedList: any[] = roster?.waitlisted || [];

  const isJoined = Boolean(joinedList.some((m) => String(m.userId) === String(currentUserId)));
  const isRequested = Boolean(requestedList.some((m) => String(m.userId) === String(currentUserId)));
  const isWaitlisted = Boolean(waitlistedList.some((m) => String(m.userId) === String(currentUserId)));

  const viewerRole: string = isHost ? 'host' : isJoined ? 'player' : 'viewer';

  const isResultPending =
    resultData?.status === 'pending_confirmation' ||
    Boolean(game?.hasPendingResult);

  const canUserVerify =
    Boolean(
      currentUserId &&
        resultData?.whoMustActNext?.some((uid: any) => String(uid) === String(currentUserId))
    ) || Boolean(game?.canUserVerifyResult);

  // Join action handler
  const handleJoinGame = async () => {
    try {
      const res = await joinMutation.mutateAsync();
      const status = res?.status || res?.data?.status;
      if (status === 'requested') {
        toast({
          type: 'info',
          title: 'Request Submitted',
          description: 'Your join request was sent to the host for review.',
        });
      } else if (status === 'waitlisted') {
        toast({
          type: 'warning',
          title: 'Added to Waitlist',
          description: 'This game is currently full. You will be notified if a spot opens.',
        });
      } else {
        toast({
          type: 'success',
          title: 'Joined Match!',
          description: 'You have been confirmed for this game.',
        });
      }
      refetchGame();
      refetchRoster();
    } catch (err: any) {
      toast({
        type: 'danger',
        title: 'Unable to Join',
        description: err?.message || 'Failed to join game. You may not meet the eligibility requirements.',
      });
      setExplainModalMode('eligibility');
      setExplainModalOpen(true);
    }
  };

  // Leave action handler
  const handleLeaveGame = async () => {
    try {
      await leaveMutation.mutateAsync();
      setLeaveModalOpen(false);
      toast({
        type: 'info',
        title: 'Left Game',
        description: 'You have withdrawn from this game.',
      });
      refetchGame();
      refetchRoster();
    } catch (err: any) {
      toast({
        type: 'danger',
        title: 'Error Leaving Game',
        description: err?.message || 'Failed to leave game. Please try again.',
      });
    }
  };

  // Host Participant Actions
  const handleApprove = async (userId: string) => {
    try {
      await approveMutation.mutateAsync(userId);
      toast({
        type: 'success',
        title: 'Player Approved',
        description: 'The player has been added to the confirmed roster.',
      });
      refetchGame();
      refetchRoster();
    } catch (err: any) {
      toast({
        type: 'danger',
        title: 'Approval Failed',
        description: err?.message || 'Failed to approve player.',
      });
    }
  };

  const handleDecline = async (userId: string) => {
    try {
      await declineMutation.mutateAsync(userId);
      toast({
        type: 'info',
        title: 'Request Declined',
        description: 'The join request has been declined.',
      });
      refetchGame();
      refetchRoster();
    } catch (err: any) {
      toast({
        type: 'danger',
        title: 'Decline Failed',
        description: err?.message || 'Failed to decline player.',
      });
    }
  };

  const handleRemove = async () => {
    if (!removeParticipantId) return;
    try {
      await removeMutation.mutateAsync({ userId: removeParticipantId, reason: 'Removed by host' });
      setRemoveParticipantId(null);
      toast({
        type: 'info',
        title: 'Participant Removed',
        description: 'The player has been removed from the roster.',
      });
      refetchGame();
      refetchRoster();
    } catch (err: any) {
      toast({
        type: 'danger',
        title: 'Remove Failed',
        description: err?.message || 'Failed to remove player.',
      });
    }
  };

  // Loading Skeleton State
  if (isGameLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error / Not Found State
  if (isGameError || !game) {
    const handleUnlockWithCode = (e: React.FormEvent) => {
      e.preventDefault();
      const clean = manualCode.trim().toUpperCase();
      if (clean) {
        setSearchParams({ code: clean });
      }
    };

    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-6">
        <ErrorState
          title="Game Not Found"
          message={gameError?.message || 'The requested game does not exist, is private, or has been removed.'}
          onRetry={() => {
            refetchGame();
            refetchRoster();
          }}
        />

        <Card className="text-left border-border-subtle shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Icon name="lock" size={18} className="text-primary" />
              Private Match Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              If this is a private match, enter the unique invite code provided by the host to unlock access.
            </p>
            <form onSubmit={handleUnlockWithCode} className="flex gap-2">
              <Input
                placeholder="e.g. A1B2C3D4"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                className="font-mono uppercase tracking-widest text-sm"
              />
              <Button type="submit" disabled={!manualCode.trim()}>
                Unlock
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          <Button variant="outline" onClick={() => navigate('/games')}>
            <Icon name="arrow-right" size={16} className="rotate-180 mr-2" />
            Back to Game Discovery
          </Button>
        </div>
      </div>
    );
  }

  // Derived Match State
  const gameStatus: GameStatusType = (game.status as GameStatusType) || 'open';
  const isCancelled = gameStatus === 'cancelled';
  const isCompleted = gameStatus === 'completed';

  // Format dates & timings
  const startDate = game.startsAt ? new Date(game.startsAt) : null;
  const endDate = game.endsAt ? new Date(game.endsAt) : null;
  const durationMinutes =
    startDate && endDate
      ? Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))
      : 60;

  // Location privacy & details
  const hasExactCourt = Boolean(game.courtName);
  const locationAddress = game.location?.addressName || game.venueName || 'Community Ground';
  const isLocationCoarsened = !game.courtName && !game.venueName && !isHost && !isJoined;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          to="/games"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name="chevron-down" size={14} className="rotate-90" />
          Back to Discovery Feed
        </Link>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-6 border-b border-border-subtle/50">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {currentSport?.name || game.sportKey.toUpperCase()}
            </h1>
            <span className="text-xl sm:text-2xl font-light text-muted-foreground">/</span>
            <span className="text-lg sm:text-xl font-medium text-muted-foreground">
              {currentFormat?.label || game.formatKey}
            </span>
            <StatusBadge status={gameStatus} />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
            <Badge variant="outline">
              {game.visibility === 'public' ? 'Public Game' : 'Private Match'}
            </Badge>
            <Badge variant={game.joinPolicy === 'open' ? 'success' : 'info'}>
              {game.joinPolicy === 'open' ? 'Instant Join' : 'Approval Required'}
            </Badge>
            {game.inviteCode && (
              <Badge variant="secondary" className="font-mono">
                Code: {game.inviteCode}
              </Badge>
            )}
          </div>
        </div>

        {/* Primary Action Button Bar */}
        <div className="flex items-center gap-3 self-start md:self-center">
          {isCancelled ? (
            <Badge variant="danger" className="text-sm px-3 py-1.5">
              Match Cancelled
            </Badge>
          ) : isResultPending ? (
            <Badge variant="warning" className="text-sm px-3 py-1.5 animate-pulse">
              Awaiting Verification
            </Badge>
          ) : isCompleted ? (
            <Badge variant="secondary" className="text-sm px-3 py-1.5">
              Match Completed
            </Badge>
          ) : isHost ? (
            <Badge variant="default" className="text-sm px-3 py-1.5">
              Host View
            </Badge>
          ) : isJoined ? (
            <div className="flex items-center gap-2">
              <Badge variant="success" className="text-sm px-3 py-1.5">
                Registered Player
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-danger border-danger/30 hover:bg-danger/10"
                onClick={() => setLeaveModalOpen(true)}
                disabled={leaveMutation.isPending}
              >
                Leave Game
              </Button>
            </div>
          ) : isRequested ? (
            <Badge variant="warning" className="text-sm px-3 py-1.5">
              Join Request Pending Approval
            </Badge>
          ) : isWaitlisted ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm px-3 py-1.5">
                On Waitlist
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLeaveGame}
                disabled={leaveMutation.isPending}
              >
                Leave Waitlist
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => {
                  setExplainModalMode('eligibility');
                  setExplainModalOpen(true);
                }}
                title="Check match participation eligibility criteria"
              >
                Eligibility
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                leftIcon="user-plus"
                isLoading={joinMutation.isPending}
                onClick={handleJoinGame}
              >
                {gameStatus === 'full' ? 'Join Waitlist' : game.joinPolicy === 'approval' ? 'Request to Join' : 'Join Game'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Pending Result Verification Notice Banner */}
      {isResultPending && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2">
              <Icon name="alert-circle" size={18} className="text-amber-600 mt-0.5 sm:mt-0 shrink-0" />
              <div>
                <p className="font-bold text-amber-800 dark:text-amber-300 text-sm">
                  {canUserVerify
                    ? 'Action Required: Match Result Pending Your Verification'
                    : 'Match Result Submitted — Pending Opponent Verification'}
                </p>
                <p className="text-muted-foreground mt-0.5">
                  {canUserVerify
                    ? 'A match score has been proposed by your opponent. Please review and confirm or dispute below.'
                    : 'The score proposal was submitted. Waiting for participants to verify before ratings update.'}
                </p>
              </div>
            </div>
            {canUserVerify && (
              <Button
                variant="primary"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  const el = document.getElementById('match-results-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Review Score
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Cancellation Notice Banner */}
      {isCancelled && game.cancellationReason && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-xs space-y-1">
          <p className="font-semibold text-danger flex items-center gap-1.5">
            <Icon name="x-circle" size={16} />
            Match Cancelled by Host
          </p>
          <p className="text-foreground">
            Reason: <span className="font-medium capitalize">{game.cancellationReason.reasonCode?.replace(/_/g, ' ')}</span>
          </p>
          {game.cancellationReason.reasonText && (
            <p className="text-muted-foreground italic">
              &quot;{game.cancellationReason.reasonText}&quot;
            </p>
          )}
        </div>
      )}

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Schedule, Location, Roster, Developer 3 Slots */}
        <div className="lg:col-span-2 space-y-8">
          {/* Key Match Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Match Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date & Time */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border-subtle bg-muted/20">
                <Icon name="calendar" className="text-primary mt-0.5 shrink-0" size={18} />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-foreground">
                    {startDate
                      ? startDate.toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Date to be confirmed'}
                  </p>
                  <p className="text-muted-foreground">
                    {startDate
                      ? `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ${
                          endDate ? endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
                        }`
                      : 'Time pending'}{' '}
                    ({durationMinutes} min)
                  </p>
                </div>
              </div>

              {/* Location & Court */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border-subtle bg-muted/20">
                <Icon name="map-pin" className="text-primary mt-0.5 shrink-0" size={18} />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-foreground">
                    {game.venueName || game.location?.addressName || 'Local Arena'}
                  </p>
                  <p className="text-muted-foreground">
                    {hasExactCourt ? (
                      <span className="font-medium text-foreground">{game.courtName}</span>
                    ) : game.venueAreaLabel ? (
                      game.venueAreaLabel
                    ) : isLocationCoarsened ? (
                      <span className="italic text-muted-foreground">Approximate area • Exact court unlocked on joining</span>
                    ) : (
                      'Assigned upon arrival'
                    )}
                  </p>
                </div>
              </div>

              {/* Skill / Rating Filter */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border-subtle bg-muted/20">
                <Icon name="trophy" className="text-primary mt-0.5 shrink-0" size={18} />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-foreground">Skill Eligibility</p>
                  <p className="text-muted-foreground">
                    {game.ratingRange ? (
                      <span>
                        {game.ratingRange.min} — {game.ratingRange.max} Elo{' '}
                        {game.ratingRange.allowUnrated && '(Unrated welcome)'}
                      </span>
                    ) : (
                      'Open to all skill levels'
                    )}
                  </p>
                </div>
              </div>

              {/* Capacity */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border-subtle bg-muted/20">
                <Icon name="users" className="text-primary mt-0.5 shrink-0" size={18} />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-foreground">Format & Capacity</p>
                  <p className="text-muted-foreground">
                    {joinedList.length} / {roster?.maxPlayers || 4} confirmed players
                  </p>
                </div>
              </div>
            </CardContent>

            {/* Host Notes */}
            {game.notes && (
              <div className="px-6 pb-6 pt-2">
                <div className="rounded-lg bg-muted/40 border border-border-subtle p-3 text-xs">
                  <span className="font-semibold text-foreground">Host Notes:</span>{' '}
                  <span className="text-muted-foreground">{game.notes}</span>
                </div>
              </div>
            )}
          </Card>

          {/* What's at Stake? Widget */}
          <MatchStakesCard
            gameId={game.id || game._id}
            sportKey={game.sportKey}
            roster={roster}
            onExplainRatings={() => {
              setExplainModalMode('rating');
              setExplainModalOpen(true);
            }}
          />

          {/* Match Activity Timeline */}
          <GameTimelineCard
            gameId={game.id || game._id}
            gameStatus={gameStatus}
            hasPendingResult={isResultPending}
            participantCount={joinedList.length}
          />

          {/* Roster View Component */}
          <RosterView
            roster={roster}
            isLoading={isRosterLoading}
            isHost={isHost}
            currentUserId={currentUserId}
            onApprove={handleApprove}
            onDecline={handleDecline}
            onRemove={(uId) => setRemoveParticipantId(uId)}
            onViewProfile={setSelectedProfileUserId}
            isActionLoading={approveMutation.isPending || declineMutation.isPending || removeMutation.isPending}
          />

          {/* Developer 3 Slots */}
          <div id="match-results-section" className="space-y-6 pt-4 border-t border-border-subtle">
            <h2 className="text-lg font-bold text-foreground">Team Balancing & Live Results</h2>

            {/* Team Balancing Slot */}
            <GameTeamsSlot
              gameId={game.id || game._id}
              viewerRole={viewerRole}
            />

            {/* Live Match Results Slot */}
            <GameResultSlot
              gameId={game.id || game._id}
              viewerRole={viewerRole}
            />
          </div>
        </div>

        {/* Right Column (1 Col): Host Controls & Quick Info Sidebar */}
        <div className="space-y-6">
          {/* Attendance & Reliability Card for Host when match is completed */}
          {isHost && (gameStatus === 'completed' || game?.status === 'completed') && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Icon name="check-circle" size={16} className="text-primary" />
                    Attendance & Reliability
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">Host Action</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Match completed. Record participant attendance to update community reliability scores.
                </p>
                <Button
                  size="sm"
                  className="w-full"
                  leftIcon="user-check"
                  onClick={() => setAttendanceModalOpen(true)}
                >
                  Record Player Attendance
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Host Controls Component */}
          {isHost && (
            <HostControls
              gameId={game.id || game._id}
              gameStatus={gameStatus}
              isHost={isHost}
              onCancelGame={async (data) => {
                await cancelMutation.mutateAsync(data);
                refetchGame();
              }}
              isCancelling={cancelMutation.isPending}
              pendingRequestsCount={requestedList.length}
              onVenueSelected={async (venueId) => {
                await updateGameMutation.mutateAsync({ venueId });
                refetchGame();
              }}
            />
          )}


          {/* Location Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Location Privacy & Venue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Icon name="map-pin" size={14} className="text-primary" />
                <span>{locationAddress}</span>
              </div>

              {isLocationCoarsened ? (
                <div className="rounded-lg bg-muted/50 p-2.5 text-muted-foreground text-[11px] leading-relaxed">
                  <span className="font-medium text-foreground">Privacy Protection:</span> Precise coordinates and private court pins are coarsened for viewers. Join this match to unlock exact navigation coordinates.
                </div>
              ) : (
                <div className="rounded-lg bg-success/10 border border-success/20 p-2.5 text-success text-[11px] leading-relaxed">
                  <span className="font-medium">Verified Location:</span> You are an authorized participant or host with access to exact court routing.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Leave Game Confirmation Dialog */}
      <ConfirmDialog
        open={leaveModalOpen}
        onOpenChange={setLeaveModalOpen}
        title="Leave Match"
        description="Are you sure you want to withdraw from this match? Your slot will immediately be made available to other players or the waitlist."
        confirmLabel="Leave Match"
        cancelLabel="Stay in Match"
        isDestructive
        isLoading={leaveMutation.isPending}
        onConfirm={handleLeaveGame}
      />

      {/* Remove Participant Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(removeParticipantId)}
        onOpenChange={(open) => !open && setRemoveParticipantId(null)}
        title="Remove Player"
        description="Are you sure you want to remove this player from the confirmed roster? They will be notified of their removal."
        confirmLabel="Remove Player"
        cancelLabel="Cancel"
        isDestructive
        isLoading={removeMutation.isPending}
        onConfirm={handleRemove}
      />

      {/* Host Match Attendance & Reliability Modal */}
      <AttendanceFeedbackModal
        isOpen={attendanceModalOpen}
        onClose={() => setAttendanceModalOpen(false)}
        gameId={game?.id || game?._id || ''}
        participants={joinedList}
        hostId={hostId || currentUserId}
      />

      {/* Player Public Profile Modal */}
      <PlayerProfileModal
        userId={selectedProfileUserId}
        isOpen={Boolean(selectedProfileUserId)}
        onClose={() => setSelectedProfileUserId(null)}
      />

      {/* Decision Explainability & Eligibility Modal */}
      <DecisionExplanationModal
        isOpen={explainModalOpen}
        onClose={() => setExplainModalOpen(false)}
        mode={explainModalMode}
        gameId={game?.id || game?._id}
      />
    </div>
  );
}
export default GameDetailsPage;


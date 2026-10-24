import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  useMyProfile,
  useMyRatings,
  useRatingHistory,
  useMyReliability,
  useUpdatePreferences,
  formatRating,
} from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
import { DecisionExplanationModal } from '../../components/explain/DecisionExplanationModal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { useToast } from '../../components/ui/Toast';
import { Select, type SelectOption } from '../../components/ui/Select';

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Icon } from '../../components/ui/Icon';

export function ProfilePage(): React.ReactElement {
  const { client, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedRatingEvent, setSelectedRatingEvent] = useState<any | null>(null);

  // 1. Fetch Player Profile
  const {
    data: profileData,
    isLoading: isProfileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useMyProfile(client);

  // 2. Fetch Player Ratings (all configured sports)
  const {
    data: ratingsData,
    isLoading: isRatingsLoading,
    error: ratingsError,
    refetch: refetchRatings,
  } = useMyRatings(client);

  // 3. Fetch Player Attendance Reliability
  const {
    data: reliabilityData,
    isLoading: isReliabilityLoading,
    error: reliabilityError,
    refetch: refetchReliability,
  } = useMyReliability(client);

  // Extract nested profile payload
  const profile = (profileData as any)?.profile || profileData;
  const displayName = profile?.displayName || user?.name || user?.email || 'Player';
  const bio = profile?.bio;
  const locationLabel = profile?.locationLabel;
  const travelRadius = profile?.travelRadiusKm;
  const timezone = profile?.timezone;

  // 4. Privacy & Session Management
  const updatePreferencesMutation = useUpdatePreferences(client);
  const { toast } = useToast();

  const [isPublicProfile, setIsPublicProfile] = useState<boolean>(true);
  const [showRatings, setShowRatings] = useState<boolean>(true);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);
  const [isRevokingSessions, setIsRevokingSessions] = useState(false);

  useEffect(() => {
    if (profile?.visibility) {
      setIsPublicProfile(profile.visibility.profile !== 'private');
      setShowRatings(profile.visibility.ratings !== 'hidden');
    }
  }, [profile?.visibility]);

  const handleSavePrivacy = async () => {
    try {
      setIsSavingPrivacy(true);
      await updatePreferencesMutation.mutateAsync({
        visibility: {
          profile: isPublicProfile ? 'public' : 'private',
          ratings: showRatings ? 'public' : 'hidden',
          location: 'coarsened',
        },
      });
      toast({
        title: 'Privacy Preferences Saved',
        description: 'Your profile and rating visibility settings have been updated.',
      });
      refetchProfile();
    } catch (err: any) {
      toast({
        title: 'Update Failed',
        description: err?.message || 'Could not update privacy preferences.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      setIsRevokingSessions(true);
      await client.post('/auth/logout-all', {});
      toast({
        title: 'Sessions Terminated',
        description: 'All other active device sessions have been revoked. Please log in again.',
      });
      window.location.assign('/login');
    } catch (err: any) {
      toast({
        title: 'Action Failed',
        description: err?.message || 'Could not revoke active sessions.',
        variant: 'destructive',
      });
    } finally {
      setIsRevokingSessions(false);
    }
  };


  // Extract ratings list
  const ratingsList: any[] = useMemo(() => {
    if (!ratingsData) return [];
    if (Array.isArray((ratingsData as any)?.ratings)) return (ratingsData as any).ratings;
    if (Array.isArray(ratingsData)) return ratingsData;
    return [];
  }, [ratingsData]);

  // Selected sport for match history
  const selectedSportKey = useMemo(() => {
    const fromUrl = searchParams.get('sport')?.toLowerCase().trim();
    if (fromUrl && ratingsList.some((r) => (r.sportKey || r.sport?.key)?.toLowerCase() === fromUrl)) {
      return fromUrl;
    }
    if (ratingsList.length > 0) {
      return (ratingsList[0].sportKey || ratingsList[0].sport?.key || '').toLowerCase();
    }
    return '';
  }, [searchParams, ratingsList]);

  const handleSportChange = (sportKey: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('sport', sportKey);
      return next;
    });
  };

  // 4. Fetch Rating History for selected sport
  const {
    data: historyData,
    isLoading: isHistoryLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useRatingHistory(client, selectedSportKey);

  const historyEvents: any[] = useMemo(() => {
    if (!historyData) return [];
    if (Array.isArray((historyData as any)?.events)) return (historyData as any).events;
    if (Array.isArray(historyData)) return historyData;
    return [];
  }, [historyData]);

  // Reliability tier badge styling
  const reliability = (reliabilityData as any)?.reliability || reliabilityData;
  const reliabilityScore = typeof reliability?.score === 'number' ? reliability.score : 100;
  const reliabilityTier: 'bronze' | 'silver' | 'gold' | 'platinum' =
    reliability?.tier || 'silver';

  const tierBadgeVariant: 'default' | 'secondary' | 'warning' | 'outline' = useMemo(() => {
    switch (reliabilityTier) {
      case 'platinum':
        return 'default';
      case 'gold':
        return 'warning';
      case 'silver':
        return 'secondary';
      case 'bronze':
      default:
        return 'outline';
    }
  }, [reliabilityTier]);

  const sportOptions: SelectOption[] = useMemo(() => {
    return ratingsList.map((r) => {
      const key = r.sportKey || r.sport?.key || '';
      const name = r.sportName || r.sport?.name || key;
      return { value: key, label: name };
    });
  }, [ratingsList]);

  const isMainLoading = (isProfileLoading && !profileData) || (isRatingsLoading && !ratingsData);
  const mainError = profileError || ratingsError;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Player Profile"
        description="Inspect your calibrated Elo ratings, peak progression, match history, and attendance reliability score."
        actions={
          <Link to="/onboarding">
            <Button variant="outline" size="sm">
              <Icon name="user" size={16} className="mr-2" />
              Edit Profile
            </Button>
          </Link>
        }
      />

      {isMainLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Skeleton className="h-44 lg:col-span-2 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
          </div>
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : mainError ? (
        <ErrorState
          errorCode="FETCH_ERROR"
          message="An error occurred while loading your profile data."
          onRetry={() => {
            refetchProfile();
            refetchRatings();
            refetchReliability();
          }}
        />
      ) : (
        <>
          {/* Profile Card & Reliability Header */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Identity & Details Card */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <Avatar fallbackText={displayName} size="lg" />
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-xl font-bold">{displayName}</CardTitle>
                    <Badge variant={tierBadgeVariant} className="capitalize">
                      {reliabilityTier} Member
                    </Badge>
                  </div>
                  <CardDescription>
                    {bio || 'No personal bio added yet.'}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border-subtle/50 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">Home Location</span>
                  <span className="font-medium text-foreground">
                    {locationLabel || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Travel Radius</span>
                  <span className="font-medium text-foreground">
                    {travelRadius ? `${travelRadius} km` : 'Not set'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Timezone</span>
                  <span className="font-medium text-foreground">
                    {timezone || 'UTC'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Reliability Score Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Reliability Score</CardTitle>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon name="check-circle" size={18} />
                  </div>
                </div>
                <CardDescription>Attendance & fair-play reliability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold tracking-tight text-foreground">
                    {reliabilityScore}
                  </span>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>

                <div className="space-y-2 text-xs text-muted-foreground pt-2 border-t border-border-subtle/50">
                  <div className="flex justify-between">
                    <span>Tier Status:</span>
                    <span className="font-semibold text-foreground capitalize">{reliabilityTier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Matches Counted:</span>
                    <span className="font-medium text-foreground">{reliability?.gamesCounted ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>No Shows / Late Leaves:</span>
                    <span className="font-medium text-foreground">
                      {(reliability?.noShows ?? 0) + (reliability?.lateLeaves ?? 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sports Elo Breakdown */}
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground mb-4">
              Sports Elo Breakdown
            </h2>

            {ratingsList.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <EmptyState
                    title="No sports configured"
                    description="Complete onboarding or select your active sports to begin tracking Elo ratings."
                    actionLabel="Select Sports"
                    onAction={() => window.location.assign('/onboarding')}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {ratingsList.map((r: any) => {
                  const sKey = (r.sportKey || r.sport?.key || '').toLowerCase();
                  const sName = r.sportName || r.sport?.name || sKey;
                  const rating = r.rating ?? 1200;
                  const peak = r.peakRating ?? rating;
                  const wins = r.wins ?? 0;
                  const losses = r.losses ?? 0;
                  const draws = r.draws ?? 0;
                  const total = (r.gamesPlayed ?? 0) || wins + losses + draws;
                  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
                  const bandLabel = r.band?.label || r.seedBandKey || 'Calibrated';
                  const isSelected = sKey === selectedSportKey;

                  return (
                    <Card
                      key={sKey}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary ring-2 ring-primary/20 shadow-md'
                          : 'hover:border-border-subtle/80'
                      }`}
                      onClick={() => handleSportChange(sKey)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base capitalize">{sName}</CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {bandLabel}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="text-3xl font-extrabold tracking-tight text-foreground">
                            {formatRating(rating)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Peak Rating: <span className="font-semibold text-foreground">{formatRating(peak)}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border-subtle/50 text-center text-xs">
                          <div className="rounded bg-muted/50 p-1.5">
                            <span className="text-muted-foreground block">Wins</span>
                            <span className="font-bold text-success">{wins}</span>
                          </div>
                          <div className="rounded bg-muted/50 p-1.5">
                            <span className="text-muted-foreground block">Losses</span>
                            <span className="font-bold text-danger">{losses}</span>
                          </div>
                          <div className="rounded bg-muted/50 p-1.5">
                            <span className="text-muted-foreground block">Win %</span>
                            <span className="font-bold text-foreground">{winRate}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Sport Match & Rating Progression History */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Match & Rating Progression History
                </h2>
                <p className="text-sm text-muted-foreground">
                  Detailed audit ledger of verified match results and Elo deltas for{' '}
                  <strong className="text-foreground capitalize">{selectedSportKey || 'selected sport'}</strong>.
                </p>
              </div>

              {sportOptions.length > 1 && (
                <div className="w-48">
                  <Select
                    options={sportOptions}
                    value={selectedSportKey}
                    onValueChange={handleSportChange}
                  />
                </div>
              )}
            </div>

            {isHistoryLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : historyError ? (
              <ErrorState
                errorCode="HISTORY_ERROR"
                message="Unable to load match progression history for this sport."
                onRetry={() => refetchHistory()}
              />
            ) : historyEvents.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <EmptyState
                    title="No match history"
                    description={`No rated matches have been recorded yet for ${selectedSportKey || 'this sport'}. Complete matches to see your rating ledger.`}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead className="text-right">Before</TableHead>
                      <TableHead className="text-right">Delta</TableHead>
                      <TableHead className="text-right">New Rating</TableHead>
                      <TableHead>Band Transition</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyEvents.map((event: any) => {
                      const delta = event.delta ?? 0;
                      const isPositive = delta > 0;
                      const isNegative = delta < 0;
                      const isWin = event.outcomeScore === 1;
                      const isDraw = event.outcomeScore === 0.5;

                      const formattedDate = event.createdAt
                        ? new Date(event.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—';

                      return (
                        <TableRow key={event.id || event._id}>
                          <TableCell className="font-medium text-sm">
                            {formattedDate}
                          </TableCell>
                          <TableCell>
                            {isWin ? (
                              <Badge variant="success">
                                Victory
                              </Badge>
                            ) : isDraw ? (
                              <Badge variant="secondary">Draw</Badge>
                            ) : (
                              <Badge variant="danger">Defeat</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-muted-foreground">
                            {formatRating(event.oldRating)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold">
                            <button
                              type="button"
                              onClick={() => setSelectedRatingEvent(event)}
                              title="Click to view Elo calculation breakdown"
                              className="inline-flex items-center gap-1 hover:underline cursor-pointer group ml-auto"
                            >
                              <span
                                className={
                                  isPositive
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : isNegative
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-muted-foreground'
                                }
                              >
                                {isPositive ? `+${delta}` : delta}
                              </span>
                              <Icon name="info" size={12} className="opacity-40 group-hover:opacity-100 text-muted-foreground" />
                            </button>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-bold text-foreground">
                            {formatRating(event.newRating)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {event.bandBefore?.label || event.bandBefore?.key || '—'}
                            {event.bandAfter?.key !== event.bandBefore?.key && (
                              <span className="text-primary font-medium ml-1">
                                → {event.bandAfter?.label || event.bandAfter?.key}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>

          {/* Privacy & Account Security Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">
                    Privacy & Account Security
                  </CardTitle>
                  <CardDescription>
                    Control your public profile visibility, calibrated ratings, and active device sessions.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  Account Controls
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Privacy Toggles */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Public Player Profile</p>
                      <p className="text-xs text-muted-foreground">
                        Allow other players and hosts to view your bio, sports, and attendance badges.
                      </p>
                    </div>
                    <Switch
                      checked={isPublicProfile}
                      onCheckedChange={setIsPublicProfile}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Display Calibrated Ratings</p>
                      <p className="text-xs text-muted-foreground">
                        Show your calibrated Elo ratings to teammates and match opponents.
                      </p>
                    </div>
                    <Switch
                      checked={showRatings}
                      onCheckedChange={setShowRatings}
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      size="sm"
                      onClick={handleSavePrivacy}
                      disabled={isSavingPrivacy}
                    >
                      {isSavingPrivacy ? 'Saving...' : 'Save Privacy Preferences'}
                    </Button>
                  </div>
                </div>

                {/* Security Controls */}
                <div className="space-y-4 md:border-l md:border-border-subtle md:pl-6">
                  <div>
                    <p className="text-sm font-medium text-foreground">Active Sessions & Devices</p>
                    <p className="text-xs text-muted-foreground">
                      Sign out of all other browsers, mobile devices, or computers where your account is currently signed in.
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-danger border-danger/40 hover:bg-danger/10 hover:text-danger"
                      leftIcon="log-out"
                      onClick={handleRevokeAllSessions}
                      disabled={isRevokingSessions}
                    >
                      {isRevokingSessions ? 'Terminating...' : 'Sign Out of All Other Devices'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}


      {/* Rating Explanation Modal */}
      <DecisionExplanationModal
        isOpen={Boolean(selectedRatingEvent)}
        onClose={() => setSelectedRatingEvent(null)}
        mode="rating"
        ratingData={
          selectedRatingEvent
            ? {
                sportKey: selectedSportKey,
                ratingBefore: selectedRatingEvent.oldRating,
                ratingAfter: selectedRatingEvent.newRating,
                delta: selectedRatingEvent.delta ?? 0,
                actualScore: selectedRatingEvent.outcomeScore,
                kFactor: selectedRatingEvent.kFactor || 32,
                expectedScore: selectedRatingEvent.expectedScore,
                opponentRatingAverage: selectedRatingEvent.opponentRatingAverage,
              }
            : undefined
        }
      />
    </div>
  );
}

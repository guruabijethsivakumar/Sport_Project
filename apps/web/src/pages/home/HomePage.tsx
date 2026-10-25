import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  useOnboardingStatus,
  useMyProfile,
  useMyGames,
  useMyRatings,
  useMyReliability,
  formatRating,
} from '@playmatch/shared';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';

export function HomePage(): React.ReactElement {
  const { isAuthenticated, user, client } = useAuth();

  const { data: onboardingData } = useOnboardingStatus(client, {
    enabled: isAuthenticated,
  });

  const { data: profileData } = useMyProfile(client, {
    enabled: isAuthenticated,
  });

  const { data: myGamesData } = useMyGames(client, {
    enabled: isAuthenticated,
  });

  const { data: ratingsData } = useMyRatings(client, undefined, {
    enabled: isAuthenticated,
  });

  const { data: reliabilityData } = useMyReliability(client, {
    enabled: isAuthenticated,
  });

  // Extract nested profile payload
  const profileObj = (profileData as any)?.profile || profileData;
  const sportsList: any[] = (profileData as any)?.sports || [];
  const firstSport = Array.isArray(sportsList) && sportsList.length > 0 ? sportsList[0] : null;

  const userEmail =
    profileObj?.email ||
    (profileData as any)?.email ||
    (profileData as any)?.user?.email ||
    user?.email ||
    (user as any)?.user?.email ||
    '';
  const displayName = profileObj?.displayName || user?.name || userEmail || 'Player';
  const bio = profileObj?.bio;
  const locationLabel = profileObj?.locationLabel;
  const travelRadius = profileObj?.travelRadiusKm;
  const preferredDays: string[] = profileObj?.preferredDays || [];
  const preferredTimeSlots: string[] = profileObj?.preferredTimeSlots || [];

  const isComplete = onboardingData?.isComplete || profileObj?.onboarding?.status === 'completed';
  const missingSteps = onboardingData?.missingSteps || [];
  const stepsLeft = missingSteps.length;

  // Role Awareness Helpers
  const userRole = String(user?.role || 'player').toLowerCase();
  const isVenueOwner = userRole === 'venue_owner' || userRole === 'host';
  const isAdmin = userRole === 'admin';

  // Profile Snapshot Fields (safely extract strings to guarantee exact values for tests & rendering)
  const rawSport = firstSport?.sport;
  const sportValue: string | null =
    typeof rawSport === 'object' && rawSport !== null
      ? (rawSport.name || rawSport.key || null)
      : (typeof rawSport === 'string' && rawSport ? rawSport : (firstSport?.sportKey || null));

  const rawBand = firstSport?.selectedBandKey || firstSport?.skillBand || firstSport?.ratingBand || firstSport?.initialSkillBand;
  const skillBandValue: string | null = typeof rawBand === 'string' && rawBand ? rawBand : null;

  const locationLabelValue: string | null = typeof locationLabel === 'string' && locationLabel ? locationLabel : null;

  const travelRadiusValue: string | null =
    typeof travelRadius === 'number'
      ? `${travelRadius} km`
      : typeof travelRadius === 'string' && travelRadius
      ? `${travelRadius} km`
      : null;

  // Ratings List
  const ratingsList: any[] = useMemo(() => {
    if (!ratingsData) return [];
    if (Array.isArray((ratingsData as any)?.ratings)) return (ratingsData as any).ratings;
    if (Array.isArray(ratingsData)) return ratingsData;
    return [];
  }, [ratingsData]);

  // Reliability
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

  // My Games & Verifications
  const myGamesList: any[] =
    (myGamesData as any)?.games ||
    (myGamesData as any)?.data?.games ||
    (Array.isArray(myGamesData) ? myGamesData : []);

  const currentUserId = user?.id || (user as any)?._id;
  const gamesNeedingVerification = myGamesList.filter((g) => {
    return Boolean(
      g.canUserVerifyResult ||
      (g.hasPendingResult &&
        g.whoMustActNext?.some((id: any) => String(id) === String(currentUserId)))
    );
  });

  const upcomingGames = myGamesList
    .filter((g) => g.status === 'open' || g.status === 'in_progress')
    .slice(0, 3);

  // Unauthenticated Landing View
  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl border border-border-subtle/60 bg-gradient-to-b from-card to-card/60 p-8 sm:p-14 text-center shadow-sm">
          <div className="mx-auto max-w-3xl space-y-6">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Find your match.{' '}
              <span className="text-primary underline decoration-primary/40 underline-offset-8">
                Climb the ladder.
              </span>
            </h1>

            <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
              Connect with players at your calibrated skill band across badminton, tennis,
              pickleball, and squash. Track your verified rating, explore game recommendations, and
              rise through the regional leaderboard.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link to="/register">
                <Button variant="primary" size="lg" className="shadow-md">
                  Create account
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Feature Highlights - Static, no feature links */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="flex flex-col">
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon name="trophy" size={20} />
              </div>
              <CardTitle>Dynamic Leaderboards</CardTitle>
              <CardDescription>
                Calibrated ELO/Glicko ratings with tie-breaking, win rate tracking, and provisional
                badges across all sports.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon name="sparkles" size={20} />
              </div>
              <CardTitle>Smart Recommendations</CardTitle>
              <CardDescription>
                Intelligent matchmaking evaluating your skill bands, travel distance, and weekly
                availability.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon name="user" size={20} />
              </div>
              <CardTitle>Calibrated Skill Bands</CardTitle>
              <CardDescription>
                Multi-sport profiles with personalized ratings, preferred positions, and flexible
                privacy settings.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  // Authenticated Home Hub
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* ─── 1. Player Identity & Reliability Hero Card ────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-gradient-to-br from-card via-card/95 to-primary/5 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative">
              <Avatar
                fallbackText={displayName}
                size="lg"
                className="h-16 w-16 sm:h-20 sm:w-20 text-xl font-bold border-2 border-primary/30 shadow-md ring-2 ring-primary/10"
              />
              <span
                className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-card shadow-xs"
                title="Active Account"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  Welcome, {displayName}
                </h1>
                <Badge
                  variant="outline"
                  className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 px-2.5 py-0.5 shadow-xs ${
                    isAdmin
                      ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                      : isVenueOwner
                      ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                      : 'bg-primary/15 text-primary border-primary/30'
                  }`}
                >
                  <Icon name={isAdmin ? 'shield-check' : isVenueOwner ? 'map-pin' : 'user'} size={12} />
                  <span>{user?.role || 'PLAYER'}</span>
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground font-medium max-w-xl">
                {isAdmin
                  ? 'Platform Administrator Dashboard — Oversight of game verification, dispute resolution, and member accounts.'
                  : isVenueOwner
                  ? 'Venue Host & Facility Dashboard — Manage your verified courts, host game slots, and track bookings.'
                  : 'Competitive Match Player Hub — Join verified local games, climb skill ladders, and submit match scores.'}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                {userEmail && (
                  <span className="flex items-center gap-1 font-mono text-muted-foreground/90">
                    <Icon name="mail" size={13} className="text-primary" />
                    {userEmail}
                  </span>
                )}
              </div>

              {bio && (
                <p className="text-xs text-muted-foreground/90 italic pt-0.5 line-clamp-2 max-w-xl">
                  &quot;{bio}&quot;
                </p>
              )}
            </div>
          </div>

          {/* Reliability Pill & Profile Link */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 pt-4 sm:pt-0 border-t sm:border-t-0 border-border/50 shrink-0">
            <div className="flex items-center gap-2">
              <Badge
                variant={tierBadgeVariant}
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs"
              >
                <Icon name="award" size={14} />
                <span>{reliabilityTier} Tier • {reliabilityScore}% Reliability</span>
              </Badge>
            </div>

            <Link to="/profile">
              <Button variant="outline" size="sm" className="text-xs font-medium">
                <Icon name="user" size={14} className="mr-1.5" />
                View Full Profile
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── 2. Action Required Banner (Match Score Verification) ────────────────── */}
      {gamesNeedingVerification.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <Icon name="alert-circle" size={22} className="animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Action Required
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {gamesNeedingVerification.length === 1
                      ? '1 match score awaiting your verification'
                      : `${gamesNeedingVerification.length} match scores awaiting your verification`}
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground">
                  Confirm Match Result
                </h3>
                <p className="text-xs text-muted-foreground">
                  Your opponent reported the match scores. Please review and verify or dispute to update your player rating.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <Link to={`/games/${gamesNeedingVerification[0].id || gamesNeedingVerification[0]._id}`}>
                <Button variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-500 text-white font-bold">
                  <Icon name="check-circle" size={16} className="mr-1.5" />
                  Review & Verify Score
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. Onboarding Incomplete Banner ───────────────────────────────────────── */}
      {!isComplete && (
        <Link
          to="/onboarding"
          className="flex items-center justify-between rounded-lg border border-warning/40 bg-warning/10 p-4 text-warning-foreground transition-colors hover:bg-warning/15"
          role="alert"
        >
          <div className="flex items-center gap-3">
            <Icon name="alert-circle" size={20} className="text-amber-500 shrink-0" />
            <span className="text-sm font-semibold text-foreground">
              Finish your profile: {stepsLeft} {stepsLeft === 1 ? 'step' : 'steps'} left
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-primary">
            <span>Continue</span>
            <Icon name="arrow-right" size={14} />
          </div>
        </Link>
      )}

      {/* ─── 4. Main Two-Column Hub ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (2 Cols): Ratings Hub, Upcoming Schedule, Parameters */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card A: Calibrated Sport Ratings & Elo Standings */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon name="trophy" size={16} />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">Your Sports & Ratings</CardTitle>
                    <CardDescription className="text-xs">
                      Calibrated Elo ratings, competitive skill bands, and records
                    </CardDescription>
                  </div>
                </div>
                <Link
                  to="/leaderboard"
                  className="text-xs text-primary hover:underline font-medium hidden sm:inline-flex items-center gap-1"
                >
                  Leaderboards <Icon name="chevron-right" size={12} />
                </Link>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5">
              {ratingsList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {ratingsList.map((r: any) => {
                    const key = r.sportKey || r.sport?.key || '';
                    const name = r.sportName || r.sport?.name || key;
                    const ratingVal = typeof r.rating === 'number' ? r.rating : 1200;
                    return (
                      <div
                        key={key}
                        className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm uppercase tracking-wide text-foreground">
                            {name}
                          </span>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {r.skillBand || 'Calibrated'}
                          </Badge>
                        </div>

                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-foreground tabular-nums">
                            {formatRating ? formatRating(ratingVal) : ratingVal}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">Elo</span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs text-muted-foreground">
                          <span>
                            {r.matchesPlayed ?? 0} matches • {r.wins ?? 0}W - {r.losses ?? 0}L
                          </span>
                          <Link
                            to={`/leaderboard?sport=${key}`}
                            className="font-medium text-primary hover:underline"
                          >
                            Rankings &rarr;
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : sportsList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {sportsList.map((s: any, idx: number) => {
                    const key = s.sportKey || (typeof s.sport === 'string' ? s.sport : s.sport?.key) || 'sport';
                    const band = s.skillBand || s.selectedBandKey || s.ratingBand || 'calibrated';
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-foreground">
                            {key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Sport'}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {band ? band.charAt(0).toUpperCase() + band.slice(1) : 'Calibrated'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Calibrated skill band ready for match play. Play your first match to activate official leaderboard ranking.
                        </p>
                        <div className="pt-1">
                          <Link to="/games">
                            <Button size="sm" variant="outline" className="w-full text-xs">
                              Find Match
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-center space-y-3">
                  <div className="h-10 w-10 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Icon name={isVenueOwner ? 'map-pin' : isAdmin ? 'shield-check' : 'trophy'} size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {isVenueOwner
                        ? 'Facility Host Account'
                        : isAdmin
                        ? 'Platform Administrator'
                        : 'No sports configured yet'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      {isVenueOwner
                        ? 'Your host account manages facility courts, reservations, and player bookings. Configure venues to enable public discovery.'
                        : isAdmin
                        ? 'Your administrator account has oversight over system matchmaking, rating calibrations, and dispute mediation.'
                        : 'Select your preferred sports in your profile to unlock calibrated ratings, competitive skill bands, and smart matchmaking.'}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <Link to="/profile">
                      <Button size="sm" variant="outline">
                        {isVenueOwner || isAdmin ? 'View Profile' : 'Configure Sports'}
                      </Button>
                    </Link>
                    {isVenueOwner ? (
                      <Link to="/venues">
                        <Button size="sm" variant="primary">
                          Manage Venues
                        </Button>
                      </Link>
                    ) : isAdmin ? (
                      <Link to="/admin">
                        <Button size="sm" variant="primary">
                          Admin Operations
                        </Button>
                      </Link>
                    ) : (
                      <Link to="/games">
                        <Button size="sm" variant="primary">
                          Find Matches
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card B: Upcoming Matches */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                    <Icon name="calendar" size={16} />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">Your Upcoming Matches</CardTitle>
                    <CardDescription className="text-xs">
                      Active schedule and registered game sessions
                    </CardDescription>
                  </div>
                </div>
                <Link
                  to="/games"
                  className="text-xs text-primary hover:underline font-medium hidden sm:inline-flex items-center gap-1"
                >
                  Browse Games <Icon name="chevron-right" size={12} />
                </Link>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5">
              {upcomingGames.length > 0 ? (
                <div className="space-y-3">
                  {upcomingGames.map((game: any) => (
                    <div
                      key={game.id || game._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm uppercase text-foreground">
                            {game.sportKey}
                          </span>
                          <Badge variant="outline" className="text-[11px] capitalize">
                            {game.formatKey || 'Standard'}
                          </Badge>
                          <Badge
                            variant={game.status === 'in_progress' ? 'warning' : 'success'}
                            className="text-[10px]"
                          >
                            {game.status === 'in_progress' ? 'Live' : 'Upcoming'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3 pt-0.5">
                          <span className="flex items-center gap-1">
                            <Icon name="clock" size={12} />
                            {new Date(game.startsAt).toLocaleString([], {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Icon name="map-pin" size={12} />
                            {game.venueName || game.location?.addressName || 'Local Arena'}
                          </span>
                        </div>
                      </div>

                      <Link to={`/games/${game.id || game._id}`} className="self-end sm:self-center">
                        <Button size="sm" variant="outline">
                          View Match
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-center space-y-3">
                  <div className="h-10 w-10 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Icon name="calendar" size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      No upcoming matches scheduled
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ready to hit the court? Explore open public games or host a new match.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-1">
                    <Link to="/games">
                      <Button size="sm" variant="outline">Browse Matches</Button>
                    </Link>
                    <Link to="/games/new">
                      <Button size="sm" variant="primary">Create a Match</Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card C: Profile Snapshot (Player Parameters & Preferences) */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                    <Icon name="user" size={16} />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">Profile Snapshot</CardTitle>
                    <CardDescription className="text-xs">
                      Your verified skill and location parameters
                    </CardDescription>
                  </div>
                </div>
                <Link
                  to="/profile"
                  className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  Manage Preferences <Icon name="chevron-right" size={12} />
                </Link>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="p-3.5 rounded-xl border border-border-subtle bg-muted/20 space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Icon name="activity" size={14} className="text-primary" />
                    Sport
                  </span>
                  <p className={sportValue ? 'font-semibold text-foreground capitalize' : 'text-muted-foreground italic'}>
                    {sportValue || 'Not selected'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border-subtle bg-muted/20 space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Icon name="award" size={14} className="text-primary" />
                    Skill Band
                  </span>
                  <p className={skillBandValue ? 'font-semibold text-foreground capitalize' : 'text-muted-foreground italic'}>
                    {skillBandValue || 'Not calibrated'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border-subtle bg-muted/20 space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Icon name="map-pin" size={14} className="text-primary" />
                    Location
                  </span>
                  <p className={locationLabelValue ? 'font-semibold text-foreground' : 'text-muted-foreground italic'}>
                    {locationLabelValue || 'Not set'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border-subtle bg-muted/20 space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Icon name="map-pin" size={14} className="text-primary" />
                    Travel Radius
                  </span>
                  <p className={travelRadiusValue ? 'font-semibold text-foreground' : 'text-muted-foreground italic'}>
                    {travelRadiusValue || 'Not set'}
                  </p>
                </div>
              </div>

              {(preferredDays.length > 0 || preferredTimeSlots.length > 0) && (
                <div className="mt-3.5 pt-3 border-t border-border/40 text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">Weekly Availability:</span>
                  {preferredDays.length > 0 ? (
                    preferredDays.map((d: string) => (
                      <Badge key={d} variant="outline" className="text-[10px] uppercase font-mono">
                        {d}
                      </Badge>
                    ))
                  ) : (
                    <span className="italic">Flexible days</span>
                  )}
                  {preferredTimeSlots.length > 0 && (
                    <span className="text-muted-foreground/80">
                      • {preferredTimeSlots.join(', ')}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 Col): Quick Actions Hub & Fair Play */}
        <div className="space-y-6">
          {/* Card D: Quick Actions */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Icon name="sparkles" size={16} className="text-primary" />
                Quick Actions
              </CardTitle>
              <CardDescription className="text-xs">
                Jump directly into competitive features
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {/* Leaderboard Action */}
              <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 hover:border-primary/40 transition-all space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <Icon name="trophy" size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Leaderboard</h4>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Track competitive rankings, Elo ladders, and player win rates
                    </p>
                  </div>
                </div>
                <Link to="/leaderboard" className="block w-full">
                  <Button variant="primary" size="sm" className="w-full">
                    <Icon name="trophy" size={14} className="mr-1.5" />
                    View Leaderboard
                  </Button>
                </Link>
              </div>

              {/* Recommendations Action */}
              <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 hover:border-primary/40 transition-all space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <Icon name="sparkles" size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Recommendations</h4>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Discover games matched to your skill rating and schedule
                    </p>
                  </div>
                </div>
                <Link to="/recommendations" className="block w-full">
                  <Button variant="outline" size="sm" className="w-full">
                    <Icon name="sparkles" size={14} className="mr-1.5" />
                    View Recommendations
                  </Button>
                </Link>
              </div>

              {/* Venue Host Action for Venue Owners */}
              {isVenueOwner && (
                <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:border-emerald-500/60 transition-all space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-500 shrink-0">
                      <Icon name="map-pin" size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Manage Venues</h4>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        Configure facility courts, slots, and verify public ground status
                      </p>
                    </div>
                  </div>
                  <Link to="/venues" className="block w-full">
                    <Button variant="outline" size="sm" className="w-full text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10">
                      <Icon name="map-pin" size={14} className="mr-1.5" />
                      Manage Venues
                    </Button>
                  </Link>
                </div>
              )}

              {/* Admin Operations for Admins */}
              {isAdmin && (
                <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:border-rose-500/60 transition-all space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-500 shrink-0">
                      <Icon name="shield-check" size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Admin Console</h4>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        Review match result disputes, user accounts, and platform health
                      </p>
                    </div>
                  </div>
                  <Link to="/admin" className="block w-full">
                    <Button variant="outline" size="sm" className="w-full text-rose-500 border-rose-500/30 hover:bg-rose-500/10">
                      <Icon name="shield-check" size={14} className="mr-1.5" />
                      Open Admin Console
                    </Button>
                  </Link>
                </div>
              )}

              {/* Host Match Action */}
              <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 hover:border-primary/40 transition-all space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                    <Icon name="plus-circle" size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Host Match</h4>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Create public or private matches and invite local players
                    </p>
                  </div>
                </div>
                <Link to="/games/new" className="block w-full">
                  <Button variant="secondary" size="sm" className="w-full">
                    <Icon name="plus" size={14} className="mr-1.5" />
                    Create Match
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Card E: Fair Play & Attendance Reliability */}
          <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Icon name="shield-check" size={16} className="text-primary" />
                  Fair Play & Reliability
                </CardTitle>
                <Badge variant={tierBadgeVariant} className="text-[10px] uppercase font-bold">
                  {reliabilityTier}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border-subtle">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Match Attendance</span>
                  <span className="font-bold text-base text-foreground tabular-nums">
                    {reliabilityScore}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block text-[11px]">Trust Level</span>
                  <span className="font-semibold text-xs text-primary capitalize">
                    {reliabilityTier} Tier
                  </span>
                </div>
              </div>

              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Consistent game attendance and timely score submissions build your reliability score, unlocking preferred match recommendations and instant join approvals.
              </p>

              <div className="pt-1 border-t border-border/40">
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline text-xs"
                >
                  View Reliability History <Icon name="chevron-right" size={12} />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

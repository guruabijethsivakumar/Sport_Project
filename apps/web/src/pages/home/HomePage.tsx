import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useOnboardingStatus, useMyProfile } from '@playmatch/shared';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';

export function HomePage(): React.ReactElement {
  const { isAuthenticated, user, client } = useAuth();

  const { data: onboardingData } = useOnboardingStatus(client, {
    enabled: isAuthenticated,
  });

  const { data: profileData } = useMyProfile(client, {
    enabled: isAuthenticated,
  });

  // Extract nested profile payload if present
  const profileObj = (profileData as any)?.profile || profileData;
  const sportsList: any[] = (profileData as any)?.sports || [];
  const firstSport = Array.isArray(sportsList) && sportsList.length > 0 ? sportsList[0] : null;

  const displayName = profileObj?.displayName || user?.name || user?.email || 'Player';
  const isComplete = onboardingData?.isComplete || profileObj?.onboarding?.status === 'completed';
  const missingSteps = onboardingData?.missingSteps || [];
  const stepsLeft = missingSteps.length;

  // Profile Snapshot Fields
  const sportValue = firstSport?.sportKey || firstSport?.sport || null;
  const skillBandValue = firstSport?.skillBand || firstSport?.ratingBand || firstSport?.initialSkillBand || null;
  const locationLabelValue = profileObj?.locationLabel || null;
  const travelRadiusValue = profileObj?.travelRadiusKm ? `${profileObj.travelRadiusKm} km` : null;

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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Welcome, {displayName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here is your PlayMatch control center and competitive activity.
        </p>
      </div>

      {/* Onboarding Incomplete Banner */}
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

      {/* Quick Action Cards: Leaderboard and Recommendations only */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Card 1: Leaderboard */}
          <Card className="flex flex-col justify-between hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon name="trophy" size={20} />
              </div>
              <CardTitle>Leaderboard</CardTitle>
              <CardDescription>
                Track competitive rankings, inspect rating progression, filter by sport, and review
                head-to-head win rates.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Link to="/leaderboard" className="w-full">
                <Button variant="primary" size="sm" className="w-full">
                  <Icon name="trophy" size={16} className="mr-2" />
                  View Leaderboard
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Card 2: Recommendations */}
          <Card className="flex flex-col justify-between hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon name="sparkles" size={20} />
              </div>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>
                Discover game recommendations matched to your calibrated skill rating, preferred
                formats, and location.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Link to="/recommendations" className="w-full">
                <Button variant="outline" size="sm" className="w-full">
                  <Icon name="sparkles" size={16} className="mr-2" />
                  View Recommendations
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Profile Snapshot */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground mb-4">
          Profile Snapshot
        </h2>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-base">Player Snapshot</CardTitle>
            <CardDescription>Your verified skill and location parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-border-subtle/50 pb-2">
              <span className="text-muted-foreground">Sport</span>
              <span className={sportValue ? 'font-medium text-foreground capitalize' : 'text-muted-foreground italic'}>
                {sportValue || 'Not selected'}
              </span>
            </div>
            <div className="flex justify-between border-b border-border-subtle/50 pb-2">
              <span className="text-muted-foreground">Skill Band</span>
              <span className={skillBandValue ? 'font-medium text-foreground capitalize' : 'text-muted-foreground italic'}>
                {skillBandValue || 'Not calibrated'}
              </span>
            </div>
            <div className="flex justify-between border-b border-border-subtle/50 pb-2">
              <span className="text-muted-foreground">Location</span>
              <span className={locationLabelValue ? 'font-medium text-foreground' : 'text-muted-foreground italic'}>
                {locationLabelValue || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-muted-foreground">Travel Radius</span>
              <span className={travelRadiusValue ? 'font-medium text-foreground' : 'text-muted-foreground italic'}>
                {travelRadiusValue || 'Not set'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

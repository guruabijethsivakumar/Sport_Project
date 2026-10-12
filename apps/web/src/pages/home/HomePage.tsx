import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useOnboardingStatus, useMyProfile } from '@playmatch/shared';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
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

  const displayName = profileData?.displayName || user?.name || user?.email || 'Player';
  const isComplete = onboardingData?.isComplete || profileData?.onboarding?.status === 'completed';

  // Unauthenticated Landing View
  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl border border-border-subtle/60 bg-gradient-to-b from-card to-card/60 p-8 sm:p-14 text-center shadow-sm">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
              <Icon name="sparkles" size={14} />
              <span>Competitive Play & Matchmaking</span>
            </div>

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
                  <Icon name="user-plus" size={18} className="mr-2" />
                  Create Account
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg">
                  Log in
                </Button>
              </Link>
              <Link to="/leaderboard">
                <Button variant="ghost" size="lg">
                  <Icon name="trophy" size={18} className="mr-2" />
                  View Leaderboard
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="flex flex-col justify-between">
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
            <CardFooter>
              <Link to="/leaderboard" className="w-full">
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  Explore Rankings <Icon name="arrow-right" size={16} />
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="flex flex-col justify-between">
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
            <CardFooter>
              <Link to="/login" className="w-full">
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  Sign in to View <Icon name="arrow-right" size={16} />
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="flex flex-col justify-between">
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
            <CardFooter>
              <Link to="/register" className="w-full">
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  Get Started <Icon name="arrow-right" size={16} />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Authenticated Dashboard Hub
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome Greeting Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-border-subtle bg-card p-6 shadow-sm md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <Avatar fallbackText={displayName} size="lg" className="border-2 border-primary/20" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Welcome back, {displayName}!
              </h1>
              {isComplete ? (
                <Badge variant="success" className="text-xs">
                  <Icon name="check" size={12} className="mr-1" /> Profile Active
                </Badge>
              ) : (
                <Badge variant="warning" className="text-xs">
                  <Icon name="alert-circle" size={12} className="mr-1" /> Onboarding Incomplete
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Ready for your next match? Here is your PlayMatch control center.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/onboarding">
            <Button variant={isComplete ? 'outline' : 'primary'} size="sm">
              <Icon name="user" size={16} className="mr-2" />
              {isComplete ? 'Edit Profile' : 'Complete Onboarding'}
            </Button>
          </Link>
        </div>
      </div>

      {/* Onboarding Incomplete Notice if pending */}
      {!isComplete && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-warning-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Icon name="alert-circle" size={20} className="text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Finish setting up your player profile
              </p>
              <p className="text-xs text-muted-foreground">
                Add your active sports and preferred skill band to start receiving personalized game
                recommendations.
              </p>
            </div>
          </div>
          <Link to="/onboarding" className="shrink-0">
            <Button variant="primary" size="sm">
              Continue Wizard <Icon name="arrow-right" size={14} className="ml-1" />
            </Button>
          </Link>
        </div>
      )}

      {/* Quick Action Navigation Grid */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground mb-4">
          Quick Actions & Destinations
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Card 1: Leaderboards */}
          <Card className="flex flex-col justify-between hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon name="trophy" size={20} />
              </div>
              <CardTitle>Leaderboards</CardTitle>
              <CardDescription>
                Track competitive rankings, inspect rating progression, filter by sport, and review
                head-to-head win rates.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Link to="/leaderboard" className="w-full">
                <Button variant="primary" size="sm" className="w-full">
                  <Icon name="trophy" size={16} className="mr-2" />
                  View Leaderboards
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
              <CardTitle>Match Recommendations</CardTitle>
              <CardDescription>
                Discover game recommendations matched to your calibrated skill rating, preferred
                formats, and location.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Link to="/recommendations" className="w-full">
                <Button variant="outline" size="sm" className="w-full">
                  <Icon name="sparkles" size={16} className="mr-2" />
                  Explore Matches
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Card 3: Profile & Onboarding */}
          <Card className="flex flex-col justify-between hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon name="user" size={20} />
              </div>
              <CardTitle>Player Preferences</CardTitle>
              <CardDescription>
                Tune your selected sports, seed rating bands, geolocation travel radius, and weekly
                game availability.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Link to="/onboarding" className="w-full">
                <Button variant="outline" size="sm" className="w-full">
                  <Icon name="user" size={16} className="mr-2" />
                  {isComplete ? 'Edit Profile' : 'Resume Onboarding'}
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Profile Snapshot & Quick Info */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Player Profile Snapshot</CardTitle>
            <CardDescription>Your registered identity and account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-border-subtle/50 pb-2">
              <span className="text-muted-foreground">Account Email</span>
              <span className="font-medium text-foreground">{user?.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-border-subtle/50 pb-2">
              <span className="text-muted-foreground">Display Name</span>
              <span className="font-medium text-foreground">{displayName}</span>
            </div>
            <div className="flex justify-between border-b border-border-subtle/50 pb-2">
              <span className="text-muted-foreground">Account Role</span>
              <Badge variant="outline" className="text-xs">
                {user?.role || 'PLAYER'}
              </Badge>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-muted-foreground">Location</span>
              <span className="font-medium text-foreground">
                {profileData?.locationLabel || 'Location not set'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between bg-card/60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-primary">
                <Icon name="sparkles" size={14} />
              </div>
              <CardTitle className="text-base">Design System & Reference</CardTitle>
            </div>
            <CardDescription>
              PlayMatch is built with an Electric Amber & Ink design system with 31 token-compliant
              components.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Developers can inspect the components, pattern library, and interactive test suite in
            the showcase viewer.
          </CardContent>
          <CardFooter>
            <Link to="/kit">
              <Button variant="ghost" size="sm">
                Open UI Kit Showcase <Icon name="arrow-right" size={14} className="ml-1" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

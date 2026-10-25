import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSportsCatalog, useMyGames } from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { Input } from '../../components/ui/Input';
import { Select, type SelectOption } from '../../components/ui/Select';
import { Slider } from '../../components/ui/Slider';
import { Switch } from '../../components/ui/Switch';
import { Button } from '../../components/ui/Button';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Icon } from '../../components/ui/Icon';
import { GameCard, type DiscoveredGameData, type MatchSignals } from '../../components/games/GameCard';
import { InviteCodeModal } from '../../components/games/InviteCodeModal';

function formatSportName(sportKey?: string): string {
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

function formatCardDateTime(isoDateString?: string): { dateStr: string; timeStr: string } {
  if (!isoDateString) return { dateStr: 'TBD', timeStr: '' };
  try {
    const d = new Date(isoDateString);
    if (isNaN(d.getTime())) return { dateStr: 'TBD', timeStr: '' };
    const dateStr = d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return { dateStr, timeStr };
  } catch {
    return { dateStr: 'TBD', timeStr: '' };
  }
}

interface RawDiscoveryItem {
  game: DiscoveredGameData;
  distanceKm: number;
  matchSignals: MatchSignals;
}

const DATE_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Any Date' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'week', label: 'This Week' },
];

const JOIN_POLICY_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Any Policy' },
  { value: 'open', label: 'Instant Join (Open)' },
  { value: 'approval', label: 'Host Approval' },
];

const SORT_OPTIONS: SelectOption[] = [
  { value: 'distance', label: 'Nearest Distance' },
  { value: 'start_time', label: 'Earliest Start Time' },
];

export function GamesDiscoveryPage(): React.ReactElement {
  const { client, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { code: routeInviteCode } = useParams<{ code?: string }>();
  const [searchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const isMyGamesRoute =
    location.pathname.includes('/my-games') ||
    location.pathname.includes('/games/mine') ||
    tabParam === 'my_games';

  // Tab State: Discover vs My Games & History
  const [activeTab, setActiveTab] = useState<'discover' | 'my_games'>(
    isMyGamesRoute ? 'my_games' : 'discover'
  );

  React.useEffect(() => {
    if (tabParam === 'my_games') {
      setActiveTab('my_games');
    } else if (tabParam === 'discover') {
      setActiveTab('discover');
    }
  }, [tabParam]);

  const [myGamesFilter, setMyGamesFilter] = useState<'all' | 'action_required' | 'pending' | 'completed' | 'active'>('all');
  const [inviteModalOpen, setInviteModalOpen] = useState(Boolean(routeInviteCode));


  // Filter States for Discovery Feed
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedJoinPolicy, setSelectedJoinPolicy] = useState<string>('all');
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [anyDistance, setAnyDistance] = useState<boolean>(false);
  const [openSeatsOnly, setOpenSeatsOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'distance' | 'start_time'>('distance');

  // Fetch My Games (user's hosted & joined matches)
  const {
    data: myGamesResponse,
    isLoading: isMyGamesLoading,
    isError: isMyGamesError,
    error: myGamesError,
    refetch: refetchMyGames,
  } = useMyGames(client, {
    enabled: Boolean(isAuthenticated),
  });

  const myRawGames: any[] =
    (myGamesResponse as any)?.games ||
    (myGamesResponse as any)?.data?.games ||
    (Array.isArray(myGamesResponse) ? myGamesResponse : []);

  const currentUserId = user?.id || (user as any)?._id;

  const myGames = useMemo(() => {
    return myRawGames.map((g) => {
      const canVerify = Boolean(
        g.canUserVerifyResult ||
        (g.hasPendingResult &&
          g.whoMustActNext?.some((id: any) => String(id) === String(currentUserId)))
      );
      const isPending = Boolean(
        g.hasPendingResult ||
        (g.status === 'completed' && g.resultStatus === 'pending_confirmation')
      );
      return {
        ...g,
        canVerify,
        isPending,
      };
    });
  }, [myRawGames, currentUserId]);

  const pendingCount = useMemo(() => {
    return myGames.filter((g) => g.canVerify).length;
  }, [myGames]);

  const pendingVerificationGames = useMemo(() => {
    return myGames.filter((g) => g.isPending);
  }, [myGames]);

  const completedGames = useMemo(() => {
    return myGames.filter((g) => g.status === 'completed');
  }, [myGames]);

  const activeGames = useMemo(() => {
    return myGames.filter((g) => g.status !== 'completed' && g.status !== 'cancelled');
  }, [myGames]);

  const filteredMyGames = useMemo(() => {
    if (myGamesFilter === 'action_required') {
      return myGames.filter((g) => g.canVerify);
    }
    if (myGamesFilter === 'pending') {
      return pendingVerificationGames;
    }
    if (myGamesFilter === 'completed') {
      return completedGames;
    }
    if (myGamesFilter === 'active') {
      return activeGames;
    }
    return myGames;
  }, [myGames, myGamesFilter, pendingVerificationGames, completedGames, activeGames]);

  // 1. Fetch Sports Catalog for filter dropdowns
  const { data: sportsData } = useSportsCatalog(client);
  const sportsList: any[] = (sportsData as any)?.sports || (sportsData as any)?.data?.sports || [];

  const sportOptions: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [{ value: 'all', label: 'All Sports' }];
    sportsList.forEach((s) => {
      opts.push({ value: s.key, label: s.name || s.key });
    });
    return opts;
  }, [sportsList]);

  // Dynamic format options based on chosen sport
  const formatOptions: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [{ value: 'all', label: 'All Formats' }];
    if (selectedSport === 'all') {
      const formatKeys = new Set<string>();
      sportsList.forEach((s) => {
        s.formats?.forEach((f: any) => {
          if (!formatKeys.has(f.key)) {
            formatKeys.add(f.key);
            opts.push({ value: f.key, label: f.label || f.key });
          }
        });
      });
    } else {
      const sportDoc = sportsList.find((s) => s.key === selectedSport);
      sportDoc?.formats?.forEach((f: any) => {
        opts.push({ value: f.key, label: f.label || f.key });
      });
    }
    return opts;
  }, [selectedSport, sportsList]);

  // Compute date boundaries
  const { startsAfter, startsBefore } = useMemo(() => {
    const now = new Date();
    if (selectedDate === 'today') {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { startsAfter: startOfToday.toISOString(), startsBefore: endOfToday.toISOString() };
    }
    if (selectedDate === 'tomorrow') {
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const startOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0);
      const endOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59, 999);
      return { startsAfter: startOfTomorrow.toISOString(), startsBefore: endOfTomorrow.toISOString() };
    }
    if (selectedDate === 'week') {
      const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return { startsAfter: now.toISOString(), startsBefore: endOfWeek.toISOString() };
    }
    return { startsAfter: undefined, startsBefore: undefined };
  }, [selectedDate]);

  // 2. Fetch Games via live backend endpoint
  const {
    data: discoveryData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<any>({
    queryKey: [
      'games',
      'discover',
      {
        selectedSport,
        selectedFormat,
        startsAfter,
        startsBefore,
        selectedJoinPolicy,
        radiusKm,
        anyDistance,
        openSeatsOnly,
        sortBy,
      },
    ],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (selectedSport !== 'all') q.set('sportKey', selectedSport);
      if (selectedFormat !== 'all') q.set('formatKey', selectedFormat);
      if (startsAfter) q.set('startsAfter', startsAfter);
      if (startsBefore) q.set('startsBefore', startsBefore);
      if (selectedJoinPolicy !== 'all') q.set('joinPolicy', selectedJoinPolicy);
      if (anyDistance) {
        q.set('anyDistance', 'true');
      } else if (radiusKm) {
        q.set('radiusKm', String(radiusKm));
      }
      if (openSeatsOnly) q.set('openSeatsOnly', 'true');
      if (sortBy) q.set('sortBy', sortBy);

      const qs = q.toString();
      const url = qs ? `/games/discover?${qs}` : '/games/discover';
      return client.get(url);
    },
    staleTime: 30000,
  });

  const rawItems: RawDiscoveryItem[] =
    discoveryData?.items || discoveryData?.data?.items || [];

  // Client-side text filter on title / notes / venue / address
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return rawItems;
    const lower = searchQuery.toLowerCase().trim();
    return rawItems.filter(({ game }) => {
      const matchNotes = game.notes?.toLowerCase().includes(lower);
      const matchVenue = game.venueName?.toLowerCase().includes(lower);
      const matchArea = game.venueAreaLabel?.toLowerCase().includes(lower);
      const matchAddress = game.location?.addressName?.toLowerCase().includes(lower);
      const matchSport = game.sportKey?.toLowerCase().includes(lower);
      return matchNotes || matchVenue || matchArea || matchAddress || matchSport;
    });
  }, [rawItems, searchQuery]);

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedSport !== 'all' ||
    selectedFormat !== 'all' ||
    selectedDate !== 'all' ||
    selectedJoinPolicy !== 'all' ||
    anyDistance ||
    radiusKm !== 25 ||
    openSeatsOnly ||
    sortBy !== 'distance';

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedSport('all');
    setSelectedFormat('all');
    setSelectedDate('all');
    setSelectedJoinPolicy('all');
    setRadiusKm(25);
    setAnyDistance(false);
    setOpenSeatsOnly(false);
    setSortBy('distance');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <PageHeader
        title={activeTab === 'discover' ? 'Discover Games' : 'My Games & History'}
        description={
          activeTab === 'discover'
            ? 'Find and join upcoming matches, pickup sessions, and open spots in your community.'
            : 'Track your scheduled matches, completed game records, and confirm pending match results.'
        }
        actions={
          <div className="flex items-center gap-2">
            {activeTab === 'discover' && hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                leftIcon="x"
              >
                Reset Filters
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInviteModalOpen(true)}
              leftIcon="key"
            >
              Join with Code
            </Button>
            <Link to="/games/new">
              <Button size="sm" variant="primary" leftIcon="user-plus">
                Host Game
              </Button>
            </Link>
          </div>
        }
      />


      {/* View Switcher Tabs */}
      <div className="flex items-center gap-3 border-b border-border-subtle pb-4 my-6">
        <button
          type="button"
          onClick={() => setActiveTab('discover')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === 'discover'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Icon name="search" size={16} />
          <span>Explore Games</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('my_games')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === 'my_games'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Icon name="trophy" size={16} />
          <span>My Games & History</span>
          {pendingCount > 0 ? (
            <span className="ml-1 inline-flex items-center justify-center rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white shadow-xs animate-pulse">
              {pendingCount} action
            </span>
          ) : myGames.length > 0 ? (
            <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold">
              {myGames.length}
            </span>
          ) : null}
        </button>
      </div>

      {activeTab === 'discover' ? (
        <>
          {/* Filter Bar Controls */}
          <div className="my-6 space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm">
        {/* Row 1: Search & Sport Chips/Select */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Keyword Search */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Search by venue or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label="Search games"
            />
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
              <Icon name="search" size={15} />
            </div>
          </div>

          {/* Sport Select */}
          <Select
            value={selectedSport}
            onValueChange={(val) => {
              setSelectedSport(val);
              setSelectedFormat('all'); // reset format on sport change
            }}
            options={sportOptions}
            aria-label="Filter by sport"
          />

          {/* Format Select */}
          <Select
            value={selectedFormat}
            onValueChange={setSelectedFormat}
            options={formatOptions}
            aria-label="Filter by format"
          />

          {/* Date Range Select */}
          <Select
            value={selectedDate}
            onValueChange={setSelectedDate}
            options={DATE_OPTIONS}
            aria-label="Filter by date"
          />
        </div>

        {/* Row 2: Secondary Controls (Radius Slider, Join Policy, Sort, Open Seats) */}
        <div className="grid grid-cols-1 items-center gap-4 pt-2 border-t border-border-subtle/40 sm:grid-cols-2 lg:grid-cols-4">
          {/* Radius Slider with Any Distance Option */}
          <div className="px-1 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                Distance Radius: {anyDistance ? 'Any distance (∞)' : `${radiusKm} km`}
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground select-none">
                <input
                  type="checkbox"
                  checked={anyDistance}
                  onChange={(e) => setAnyDistance(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span className={anyDistance ? 'text-primary font-bold' : ''}>Any distance</span>
              </label>
            </div>
            <Slider
              min={1}
              max={50}
              step={1}
              disabled={anyDistance}
              value={[radiusKm]}
              onValueChange={(vals) => setRadiusKm(vals[0])}
              unit=" km"
              className={anyDistance ? 'opacity-40 pointer-events-none' : ''}
              aria-label="Distance Radius"
            />
          </div>

          {/* Join Policy */}
          <Select
            value={selectedJoinPolicy}
            onValueChange={setSelectedJoinPolicy}
            options={JOIN_POLICY_OPTIONS}
            aria-label="Filter by join policy"
          />

          {/* Sort By */}
          <Select
            value={sortBy}
            onValueChange={(val) => setSortBy(val as 'distance' | 'start_time')}
            options={SORT_OPTIONS}
            aria-label="Sort by"
          />

          {/* Open Seats Toggle */}
          <div className="flex items-center justify-between sm:justify-start sm:gap-3 py-1">
            <Switch
              id="open-seats-switch"
              checked={openSeatsOnly}
              onCheckedChange={setOpenSeatsOnly}
              label="Open spots only"
            />
          </div>
        </div>

        {/* Quick Sport Chips for Easy Tap Discovery */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs font-medium text-muted-foreground mr-1">Quick:</span>
          {sportOptions.map((opt) => {
            const isSelected = selectedSport === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setSelectedSport(opt.value);
                  setSelectedFormat('all');
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header / Counter */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {isLoading ? 'Searching games...' : `${filteredItems.length} games available`}
          </span>
          {hasActiveFilters && (
            <Badge variant="outline" className="text-xs">
              Filtered
            </Badge>
          )}
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-xs font-medium text-primary hover:underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div
          data-testid="loading-skeletons"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-5 space-y-4"
            >
              <div className="flex justify-between">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-5 w-16" shape="pill" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
              <div className="pt-3 border-t border-border-subtle/50 flex justify-between items-center">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Unable to load games"
          message={
            error instanceof Error
              ? error.message
              : 'Failed to fetch games from the server. Please verify your connection.'
          }
          onRetry={() => refetch()}
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon="search"
          title="No games found"
          description={
            hasActiveFilters
              ? 'No games match your current filter settings. Try broadening your radius or clearing selected filters.'
              : 'There are currently no open games in your area. Check back later!'
          }
          actionLabel={hasActiveFilters ? 'Clear Filters' : undefined}
          onAction={hasActiveFilters ? handleClearFilters : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map(({ game, distanceKm, matchSignals }) => {
            const cardKey = game._id || game.id || Math.random().toString();
            return (
              <GameCard
                key={cardKey}
                game={game}
                distanceKm={distanceKm}
                matchSignals={matchSignals}
              />
            );
          })}
        </div>
      )}
    </>
  ) : (
    <div className="space-y-6">
      {/* Filter Pills Bar & Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMyGamesFilter('all')}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
              myGamesFilter === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            All Games ({myGames.length})
          </button>
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={() => setMyGamesFilter('action_required')}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-all flex items-center gap-1.5 ${
                myGamesFilter === 'action_required'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25'
              }`}
            >
              <Icon name="alert-circle" size={13} className="animate-pulse" />
              Action Required ({pendingCount})
            </button>
          )}
          <button
            type="button"
            onClick={() => setMyGamesFilter('pending')}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
              myGamesFilter === 'pending'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            Pending Verification ({pendingVerificationGames.length})
          </button>
          <button
            type="button"
            onClick={() => setMyGamesFilter('completed')}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
              myGamesFilter === 'completed'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            Completed ({completedGames.length})
          </button>
          <button
            type="button"
            onClick={() => setMyGamesFilter('active')}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
              myGamesFilter === 'active'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            Active & Upcoming ({activeGames.length})
          </button>
        </div>

        <span className="text-xs text-muted-foreground">
          Showing {filteredMyGames.length} of {myGames.length} matches
        </span>
      </div>

      {/* Main Tab Content States */}
      {!isAuthenticated ? (
        <EmptyState
          icon="user"
          title="Sign in to view your games"
          description="You must be signed in to view your match history, upcoming games, and verify scores."
          actionLabel="Sign In"
          onAction={() => navigate('/login')}
        />
      ) : isMyGamesLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-5 w-16" shape="pill" />
              </div>
              <Skeleton className="h-4 w-1/2" />
              <div className="space-y-2 pt-2 border-t border-border-subtle/40">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="pt-2 flex justify-end">
                <Skeleton className="h-8 w-28" />
              </div>
            </div>
          ))}
        </div>
      ) : isMyGamesError ? (
        <ErrorState
          title="Unable to load match history"
          message={
            myGamesError instanceof Error
              ? myGamesError.message
              : 'Failed to fetch your matches. Please check your network and try again.'
          }
          onRetry={() => refetchMyGames()}
        />
      ) : filteredMyGames.length === 0 ? (
        <EmptyState
          icon="trophy"
          title="No matches found"
          description={
            myGamesFilter === 'action_required'
              ? 'Great job! You have no pending match results awaiting your verification.'
              : myGamesFilter === 'pending'
              ? 'None of your matches are currently awaiting verification.'
              : 'You have not joined or hosted any games in this category.'
          }
          actionLabel="Discover Open Games"
          onAction={() => setActiveTab('discover')}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMyGames.map((game) => {
            const gameKey = game.id || game._id || Math.random().toString();
            const { dateStr, timeStr } = formatCardDateTime(game.startsAt);
            const isHost = String(game.hostId?.id || game.hostId?._id || game.hostId) === String(currentUserId);

            return (
              <div
                key={gameKey}
                className={`rounded-2xl border p-5 transition-all shadow-sm ${
                  game.canVerify
                    ? 'border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-card to-amber-500/5 ring-1 ring-amber-500/30'
                    : 'border-border bg-card hover:border-border-subtle'
                }`}
              >
                {/* Card Top: Sport, Format & Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-foreground">
                        {formatSportName(game.sportKey)}
                      </span>
                      {game.formatKey && (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {formatFormatName(game.formatKey)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isHost ? 'Hosted by you' : 'Participant'}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {game.canVerify ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30 animate-pulse">
                        <Icon name="alert-circle" size={13} />
                        Action Required
                      </span>
                    ) : game.isPending ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                        <Icon name="clock" size={13} />
                        Awaiting Opponent
                      </span>
                    ) : game.resultStatus === 'verified' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <Icon name="check-circle" size={13} />
                        Verified
                      </span>
                    ) : (
                      <StatusBadge status={game.status} />
                    )}
                  </div>
                </div>

                {/* Timing & Venue */}
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Icon name="calendar" size={14} className="text-primary shrink-0" />
                    <span>
                      {dateStr} {timeStr && `at ${timeStr}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Icon name="map-pin" size={14} className="text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {game.venueName || game.location?.addressName || 'Local Arena'}
                    </span>
                  </div>
                </div>

                {/* Confirmed Winner Badge */}
                {game.confirmedResult && (
                  <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1.5 truncate">
                      <Icon name="trophy" size={14} className="text-warning shrink-0" />
                      <span className="truncate">Winner: {game.confirmedResult.winnerLabel}</span>
                    </span>
                    {game.confirmedResult.scoreSummary && (
                      <span className="font-mono font-bold text-foreground shrink-0 ml-2">
                        {game.confirmedResult.scoreSummary}
                      </span>
                    )}
                  </div>
                )}

                {/* Bottom Action Links */}
                <div className="mt-5 pt-4 border-t border-border-subtle flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {game.participantCount || 2} players
                  </span>
                  <Link
                    to={`/games/${game.id || game._id}?from=my_games`}
                    state={{ from: 'my_games' }}
                  >
                    {game.canVerify ? (
                      <Button
                        variant="primary"
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
                      >
                        <Icon name="check-circle" size={14} className="mr-1.5" />
                        Review & Verify Result
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm">
                        <Icon name="eye" size={14} className="mr-1.5" />
                        View Match
                      </Button>
                    )}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )}

  <InviteCodeModal
    isOpen={inviteModalOpen}
    onClose={() => setInviteModalOpen(false)}
    initialCode={routeInviteCode || ''}
  />

</div>
);
}
export default GamesDiscoveryPage;


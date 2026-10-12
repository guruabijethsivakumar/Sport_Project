import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useSportsCatalog,
  useLeaderboardInfinite,
  formatRating,
  LEADERBOARD_MESSAGES,
} from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select, type SelectOption } from '../../components/ui/Select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';
import { Card, CardContent } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Tooltip } from '../../components/ui/Tooltip';
import { LoadMore } from '../../components/ui/LoadMore';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { QueryBoundary } from '../../components/patterns/QueryBoundary';
import { cn } from '../../lib/utils';

export function LeaderboardPage(): React.ReactElement {
  const { client, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. Fetch Sports Catalog for sport selector
  const { data: sportsData, isLoading: isSportsLoading } = useSportsCatalog(client);

  const sportsList: Array<{ key: string; name: string }> = useMemo(() => {
    if (!sportsData) return [];
    if (Array.isArray(sportsData)) return sportsData;
    if (Array.isArray((sportsData as any).sports)) return (sportsData as any).sports;
    return [];
  }, [sportsData]);

  // Current sportKey selection from URL search params validated against catalog, fallback to first catalog sport
  const currentSportKey = useMemo(() => {
    const fromUrl = searchParams.get('sport')?.toLowerCase().trim();
    if (fromUrl && sportsList.some((s) => s.key.toLowerCase() === fromUrl)) {
      return fromUrl;
    }
    if (sportsList.length > 0) {
      return sportsList[0].key;
    }
    return '';
  }, [searchParams, sportsList]);

  const handleSportChange = (sportKey: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('sport', sportKey);
      return next;
    });
  };

  // 2. Fetch Infinite Leaderboard data for current sportKey
  const {
    data: leaderboardData,
    isLoading: isLeaderboardLoading,
    error: leaderboardError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useLeaderboardInfinite(client, currentSportKey, 20);

  // Flatten all pages of leaderboard entries
  const allEntries = useMemo(() => {
    if (!leaderboardData?.pages) return [];
    return leaderboardData.pages.flatMap((page: any) => {
      if (Array.isArray(page?.entries)) return page.entries;
      if (Array.isArray(page?.data?.entries)) return page.data.entries;
      if (Array.isArray(page)) return page;
      return [];
    });
  }, [leaderboardData]);

  const _currentSportName = useMemo(() => {
    const found = sportsList.find((s) => s.key === currentSportKey);
    return found?.name || currentSportKey.replace(/_/g, ' ');
  }, [sportsList, currentSportKey]);

  const sportOptions: SelectOption[] = useMemo(() => {
    return sportsList.map((s) => ({
      value: s.key,
      label: s.name,
    }));
  }, [sportsList]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <PageHeader
        title={LEADERBOARD_MESSAGES.title}
        description={LEADERBOARD_MESSAGES.subtitle}
        actions={
          <div className="w-full sm:w-56">
            <Select
              value={currentSportKey || undefined}
              onValueChange={handleSportChange}
              options={sportOptions}
              placeholder={LEADERBOARD_MESSAGES.sportFilterLabel}
              disabled={isSportsLoading || sportOptions.length === 0}
            />
          </div>
        }
      />

      {/* Main Content with QueryBoundary */}
      <QueryBoundary
        isLoading={isLeaderboardLoading && !leaderboardData}
        error={leaderboardError as Error | null}
        data={allEntries}
        onRetry={refetch}
        isEmpty={(entries) => entries.length === 0}
        loadingFallback={
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        }
        emptyState={
          <EmptyState
            icon="trophy"
            title={LEADERBOARD_MESSAGES.emptyTitle}
            description={LEADERBOARD_MESSAGES.emptyDescription}
          />
        }
      >
        {(entries) => (
          <div className="space-y-4">
            {/* Desktop Table View (hidden on small screens) */}
            <div className="hidden md:block">
              <Table aria-label="Leaderboard standings">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20 text-center">
                      {LEADERBOARD_MESSAGES.rankColumn}
                    </TableHead>
                    <TableHead>{LEADERBOARD_MESSAGES.playerColumn}</TableHead>
                    <TableHead className="text-right">
                      {LEADERBOARD_MESSAGES.ratingColumn}
                    </TableHead>
                    <TableHead className="text-center">
                      {LEADERBOARD_MESSAGES.gamesPlayedColumn}
                    </TableHead>
                    <TableHead className="text-right">
                      {LEADERBOARD_MESSAGES.winRateColumn}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry: any, index: number) => {
                    const rank = index + 1;
                    const isCurrentUser = Boolean(user?.id && entry.userId === user.id);
                    const totalGames = entry.gamesPlayed || 0;
                    const wins = entry.wins || 0;
                    const winRate =
                      totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
                    const displayName =
                      entry.displayName || LEADERBOARD_MESSAGES.anonymousPlayer;

                    return (
                      <TableRow
                        key={entry.userId || `entry-${index}`}
                        className={cn(
                          isCurrentUser &&
                            'bg-primary/10 hover:bg-primary/15 font-medium border-l-4 border-l-primary'
                        )}
                        data-current-user={isCurrentUser ? 'true' : undefined}
                      >
                        {/* Rank */}
                        <TableCell className="text-center font-bold">
                          {rank === 1 ? (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
                              1
                            </span>
                          ) : rank === 2 ? (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-300/40 text-slate-700 dark:text-slate-300 font-bold">
                              2
                            </span>
                          ) : rank === 3 ? (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-700/20 text-amber-800 dark:text-amber-500 font-bold">
                              3
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{rank}</span>
                          )}
                        </TableCell>

                        {/* Player details */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={entry.avatarUrl || undefined}
                              fallbackText={displayName}
                              size="sm"
                            />
                            <div className="flex items-center gap-2 min-w-0">
                              <Tooltip content={displayName}>
                                <span className="text-foreground font-semibold max-w-44 truncate block">
                                  {displayName}
                                </span>
                              </Tooltip>
                              {isCurrentUser && (
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 shrink-0">
                                  You
                                </Badge>
                              )}
                              {entry.provisional && (
                                <Tooltip content={LEADERBOARD_MESSAGES.provisionalTooltip}>
                                  <Badge variant="warning" className="cursor-help shrink-0">
                                    {LEADERBOARD_MESSAGES.provisionalBadge}
                                  </Badge>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Rating */}
                        <TableCell className="text-right tabular-nums font-semibold">
                          {formatRating(entry.rating, entry.band?.label)}
                        </TableCell>

                        {/* Games Played */}
                        <TableCell className="text-center tabular-nums text-muted-foreground">
                          {totalGames}
                        </TableCell>

                        {/* Win Rate / Record */}
                        <TableCell className="text-right tabular-nums">
                          <span className="font-medium text-foreground">{winRate}%</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({entry.wins || 0}
                            {LEADERBOARD_MESSAGES.wins} {entry.losses || 0}
                            {LEADERBOARD_MESSAGES.losses})
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View (hidden on md and above) */}
            <div className="grid gap-3 md:hidden">
              {entries.map((entry: any, index: number) => {
                const rank = index + 1;
                const isCurrentUser = Boolean(user?.id && entry.userId === user.id);
                const totalGames = entry.gamesPlayed || 0;
                const wins = entry.wins || 0;
                const winRate =
                  totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
                const displayName =
                  entry.displayName || LEADERBOARD_MESSAGES.anonymousPlayer;

                return (
                  <Card
                    key={entry.userId || `mobile-entry-${index}`}
                    className={cn(
                      'p-4 transition-colors',
                      isCurrentUser && 'border-primary/50 bg-primary/5 shadow-sm'
                    )}
                    data-current-user={isCurrentUser ? 'true' : undefined}
                  >
                    <CardContent className="p-0 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Rank Circle */}
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-sm text-foreground">
                          {rank}
                        </div>

                        {/* Avatar & Player Info */}
                        <Avatar
                          src={entry.avatarUrl || undefined}
                          fallbackText={displayName}
                          size="sm"
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-semibold text-foreground text-sm truncate">
                              {displayName}
                            </span>
                            {isCurrentUser && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                                You
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>
                              {totalGames} {LEADERBOARD_MESSAGES.gamesPlayedColumn.toLowerCase()}
                            </span>
                            <span>•</span>
                            <span>{winRate}% {LEADERBOARD_MESSAGES.winRateColumn.toLowerCase()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Rating & Provisional */}
                      <div className="text-right shrink-0">
                        <div className="font-bold text-sm text-foreground tabular-nums">
                          {formatRating(entry.rating, entry.band?.label)}
                        </div>
                        {entry.provisional && (
                          <Badge variant="warning" className="text-[10px] py-0 px-1.5 mt-1">
                            {LEADERBOARD_MESSAGES.provisionalBadge}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Load More Pagination */}
            <LoadMore
              hasMore={Boolean(hasNextPage)}
              isLoading={isFetchingNextPage}
              onLoadMore={() => fetchNextPage()}
              label={LEADERBOARD_MESSAGES.loadMore}
            />
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}

# PlayMatch Screen Recipe & Architectural Patterns

This guide documents the canonical recipe for authoring new screens in PlayMatch (`apps/web`). It is the authoritative standard established in **D1-2** from the reference implementations:
- **`LoginPage`** ([`apps/web/src/pages/auth/LoginPage.tsx`](file:///c:/GURU%20ABIJETH%20S/playmatch/apps/web/src/pages/auth/LoginPage.tsx)): Form pattern, validation, security error mapping, password toggling, open redirect defense.
- **`LeaderboardPage`** ([`apps/web/src/pages/leaderboard/LeaderboardPage.tsx`](file:///c:/GURU%20ABIJETH%20S/playmatch/apps/web/src/pages/leaderboard/LeaderboardPage.tsx)): Data-list pattern, dual responsive view (desktop Table / mobile Cards), `QueryBoundary`, URL search sync, computed sequential ranking, infinite scroll (`LoadMore`).

---

## 1. Golden Rules for Screen Authors

1. **Kit Components Only**: Never import Radix primitives (`@radix-ui/*`) or icons from `lucide-react` directly in page or feature files.
   - Use `<Icon name="..." />` from `components/ui/Icon`.
   - Use design-system kit components from `components/ui/*`.
2. **Replaced Semantic Tokens**: Never use raw hex (`#...`), rgb, inline CSS `style={{ ... }}`, or arbitrary Tailwind classes (`bg-[#...]`, `text-[13px]`). Only use semantic design-system tokens (`bg-bg`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, etc.).
3. **No Hardcoded Strings & Labels**: All user-facing strings must come from `@playmatch/shared` constants (`AUTH_MESSAGES`, `LEADERBOARD_MESSAGES`, `COMMON_MESSAGES`, etc.).
4. **Shared Formatters**:
   - Ratings: `formatRating(rating, bandLabel)` — uses the backend-returned band label; never derive bands from custom rating ranges.
   - Distances: `formatDistance(distanceKm)` — outputs exact distance; never invent `~` or use leaked meter fields.
   - Dates: `formatDate(isoString, { timeZone })` and `formatRelativeTime(isoString)`.
5. **Security & Information Leakage**:
   - Never print raw server error messages, internal database error details, or lockout parameters (`failedLoginAttempts`, `lockUntil`). Always display static generic message keys from `AUTH_MESSAGES` or `ERROR_MESSAGES`.
   - Never log API error objects containing sensitive auth data to the console.

---

## 2. Recipe 1: Form Screen (React Hook Form + Zod)

### Anatomy
```tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginFormSchema, type LoginFormValues, AUTH_MESSAGES } from '@playmatch/shared';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { FormErrorBanner } from '../../components/patterns/FormPattern';

export function MyFormPage() {
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  });

  const onSubmit = async (data: LoginFormValues) => {
    setBannerError(null);
    setIsSubmitting(true);
    try {
      await myApiCall(data);
    } catch (err: any) {
      // Map to safe generic client message
      setBannerError(AUTH_MESSAGES.invalidCredentials);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold">{AUTH_MESSAGES.loginTitle}</CardTitle>
          <CardDescription>{AUTH_MESSAGES.loginSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <FormErrorBanner error={bannerError} onDismiss={() => setBannerError(null)} />
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField id="email" label={AUTH_MESSAGES.emailLabel} error={errors.email?.message} required>
              <Input
                id="email"
                type="email"
                placeholder={AUTH_MESSAGES.emailPlaceholder}
                isError={Boolean(errors.email)}
                disabled={isSubmitting}
                {...register('email')}
              />
            </FormField>
            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              {AUTH_MESSAGES.signInButton}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Key Practices:
- Always set `noValidate` on the `<form>` to suppress browser default popups in favor of accessible custom messages.
- Always link the label to input via `id` and `htmlFor`.
- Map field errors via `FormField error={errors.field?.message}` and `isError={Boolean(errors.field)}`.
- Render top-level server errors safely in `FormErrorBanner` with `role="alert"`.

---

## 3. Recipe 2: Data-List Screen (QueryBoundary + Responsive Table/Cards)

### Anatomy
```tsx
import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLeaderboardInfinite, formatRating, LEADERBOARD_MESSAGES } from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Card, CardContent } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { LoadMore } from '../../components/ui/LoadMore';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { QueryBoundary } from '../../components/patterns/QueryBoundary';
import { cn } from '../../lib/utils';

export function MyDataListPage() {
  const { client, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const sport = searchParams.get('sport') || 'badminton';

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useLeaderboardInfinite(client, sport, 20);

  const allEntries = useMemo(() => {
    return data?.pages?.flatMap((page: any) => page.entries || []) || [];
  }, [data]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <PageHeader
        title={LEADERBOARD_MESSAGES.title}
        description={LEADERBOARD_MESSAGES.subtitle}
        actions={
          <Select
            value={sport}
            onValueChange={(val) => setSearchParams({ sport: val })}
            options={[{ value: 'badminton', label: 'Badminton' }]}
          />
        }
      />

      <QueryBoundary
        isLoading={isLoading && !data}
        error={error as Error | null}
        data={allEntries}
        onRetry={refetch}
        isEmpty={(items) => items.length === 0}
        loadingFallback={<Skeleton className="h-64 w-full rounded-xl" />}
        emptyState={
          <EmptyState
            icon="trophy"
            title={LEADERBOARD_MESSAGES.emptyTitle}
            description={LEADERBOARD_MESSAGES.emptyDescription}
          />
        }
      >
        {(items) => (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: any, index: number) => (
                    <TableRow key={item.userId} className={cn(item.userId === user?.id && 'bg-primary/10')}>
                      <TableCell className="font-bold">{index + 1}</TableCell>
                      <TableCell>{item.displayName}</TableCell>
                      <TableCell className="text-right">{formatRating(item.rating, item.band?.label)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="grid gap-3 md:hidden">
              {items.map((item: any, index: number) => (
                <Card key={item.userId} className={cn(item.userId === user?.id && 'border-primary/50 bg-primary/5')}>
                  <CardContent className="flex items-center justify-between p-4">
                    <span className="font-bold">{index + 1}</span>
                    <span>{item.displayName}</span>
                    <span>{formatRating(item.rating, item.band?.label)}</span>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
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
```

### Key Practices:
- **Responsive Presentation**: Render `<Table>` inside `<div className="hidden md:block">` and lightweight `<Card>` representations inside `<div className="grid gap-3 md:hidden">`.
- **Rank Computation**: Do not assume the backend returns `rank`. Compute sequentially from position: `index + 1`.
- **QueryBoundary**: Encapsulates `isLoading`, `error` (with retry callback), and `isEmpty` states uniformly.
- **User Row Highlighting**: Compare `item.userId === user?.id` to apply soft primary highlighting (`bg-primary/10`) and a "You" badge.

---

## 4. Registering Routes in the Registry

Add route modules inside `apps/web/src/routes/dev*.routes.ts` declaring owner and navigation properties:

```ts
export const dev1Routes: DomainRouteModule = [
  {
    path: '/leaderboard',
    element: <LeaderboardPage />,
    owner: 'Dev 1',
    nav: {
      label: 'Leaderboard',
      order: 20,
    },
  },
];
```
The navbar automatically inspects `allDomainRoutes` and dynamically mounts nav links in numerical `order`.

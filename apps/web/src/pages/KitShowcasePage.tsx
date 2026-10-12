import React, { useState } from 'react';
import {
  Button,
  Input,
  Textarea,
  Select,
  Checkbox,
  Switch,
  RadioGroup,
  Slider,
  DateTimeInput,
  FormField,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  StatusBadge,
  ConfidenceBadge,
  Dialog,
  ConfirmDialog,
  Sheet,
  DropdownMenu,
  Popover,
  Tooltip,
  useToast,
  Tabs,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Avatar,
  Progress,
  StatCard,
  Stepper,
  Skeleton,
  EmptyState,
  ErrorState,
  LoadMore,
  PageHeader,
  DemoBadge,
} from '../components/ui';
import { PageLayout } from '../components/patterns';
import { useTheme } from '../theme/ThemeContext';

export function KitShowcasePage(): React.ReactElement {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sliderVal, setSliderVal] = useState([25]);
  const [checkVal, setCheckVal] = useState(true);
  const [switchVal, setSwitchVal] = useState(false);
  const [radioVal, setRadioVal] = useState('football');
  const [selectVal, setSelectVal] = useState('badminton');
  const [stepperStep, setStepperStep] = useState(1);

  return (
    <PageLayout maxWidth="xl" className="space-y-12 pb-24">
      <PageHeader
        title="PlayMatch Design System & UI Kit"
        description="Interactive showcase of all 31 accessible primitives and pattern components."
        tags={
          <>
            <Badge variant="outline">v1.0.0</Badge>
            <DemoBadge isMock={true} />
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={resolvedTheme === 'light' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setTheme('light')}
            >
              Light
            </Button>
            <Button
              variant={resolvedTheme === 'dark' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setTheme('dark')}
            >
              Dark
            </Button>
            <Button
              variant={theme === 'system' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTheme('system')}
            >
              System
            </Button>
          </div>
        }
      />

      {/* 1. Buttons & Actions */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground">1. Buttons & Actions</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="primary">Primary (#c2410c)</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="success">Success</Button>
          <Button variant="primary" isLoading={true}>
            Loading
          </Button>
          <Button variant="primary" leftIcon="sparkles">
            With Icon
          </Button>
          <Button variant="outline" size="sm">
            Small
          </Button>
          <Button variant="primary" size="lg">
            Large
          </Button>
        </div>
      </section>

      {/* 2. Form Controls & Inputs */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground">2. Form Controls & Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField label="Standard Text Input" helperText="Accessible border (>=3.0:1)">
            <Input placeholder="Enter your player handle..." />
          </FormField>

          <FormField label="Error State Input" error="This username is already taken.">
            <Input defaultValue="invalid_handle" isError={true} />
          </FormField>

          <FormField label="Radix Select">
            <Select
              value={selectVal}
              onValueChange={setSelectVal}
              options={[
                { value: 'badminton', label: 'Badminton' },
                { value: 'cricket', label: 'Cricket' },
                { value: 'football', label: 'Football' },
              ]}
            />
          </FormField>

          <FormField label="Date / Time Native">
            <DateTimeInput type="date" defaultValue="2026-10-15" timeZoneLabel="UTC+5:30" />
          </FormField>

          <FormField label="Travel Distance Slider">
            <Slider
              value={sliderVal}
              onValueChange={setSliderVal}
              min={1}
              max={50}
              unit=" km"
              label="Search Radius"
            />
          </FormField>

          <div className="space-y-4 pt-2">
            <Checkbox
              id="kit-checkbox"
              checked={checkVal}
              onCheckedChange={(c) => setCheckVal(Boolean(c))}
              label="Email notifications for match invites"
              description="Receive weekly summaries of nearby open games."
            />
            <Switch
              id="kit-switch"
              checked={switchVal}
              onCheckedChange={setSwitchVal}
              label="Make profile visible to public discovery"
            />
          </div>
        </div>

        <div className="pt-2">
          <FormField label="Preferred Sport Format">
            <RadioGroup
              value={radioVal}
              onValueChange={setRadioVal}
              options={[
                { value: 'badminton', label: 'Badminton Singles / Doubles' },
                { value: 'cricket', label: 'Box Cricket (6-a-side / Turf)' },
                { value: 'football', label: 'Futsal (5-a-side)' },
              ]}
            />
          </FormField>
        </div>

        <FormField label="Player Bio / Notes">
          <Textarea placeholder="Describe your play style, experience, or equipment..." />
        </FormField>
      </section>

      {/* 3. Badges, Game Status & Dual Indicators */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          3. Badges, Game Statuses & Dual Indicators (Icon + Label + Color)
        </h2>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2.5 items-center">
            <span className="text-xs text-muted-foreground mr-2 font-medium">Game Statuses:</span>
            <StatusBadge status="open" />
            <StatusBadge status="full" />
            <StatusBadge status="confirmed" />
            <StatusBadge status="in_progress" />
            <StatusBadge status="completed" />
            <StatusBadge status="cancelled" />
            <StatusBadge status="expired" />
          </div>

          <div className="flex flex-wrap gap-2.5 items-center">
            <span className="text-xs text-muted-foreground mr-2 font-medium">AI Confidence:</span>
            <ConfidenceBadge confidence="high" />
            <ConfidenceBadge confidence="medium" />
            <ConfidenceBadge confidence="low" />
          </div>

          <div className="flex flex-wrap gap-2.5 items-center">
            <span className="text-xs text-muted-foreground mr-2 font-medium">Standard Badges:</span>
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="danger">Danger</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="info">Info</Badge>
            <DemoBadge isMock={true} />
          </div>
        </div>
      </section>

      {/* 4. Overlays, Dialogs, Sheets, Tooltips & Toasts */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          4. Overlays, Dialogs, Sheets & Toasts
        </h2>
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            Open Dialog (Radix)
          </Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Open Confirm Dialog
          </Button>
          <Button variant="outline" onClick={() => setSheetOpen(true)}>
            Open Sheet / Drawer
          </Button>

          <DropdownMenu
            trigger={<Button variant="outline" rightIcon="chevron-down">Dropdown Menu</Button>}
            items={[
              { key: 'view', label: 'View Profile', icon: 'users', onSelect: () => {} },
              { key: 'edit', label: 'Edit Preferences', icon: 'filter', onSelect: () => {} },
              'separator',
              { key: 'logout', label: 'Sign Out', icon: 'logout', destructive: true, onSelect: () => {} },
            ]}
          />

          <Popover
            trigger={<Button variant="outline">Popover</Button>}
          >
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Quick Match Rules</h4>
              <p className="text-xs text-muted-foreground">
                Matches are 21-point rally scoring. Standard BWF regulations apply.
              </p>
            </div>
          </Popover>

          <Tooltip content="Elo rating updated from verified match scores.">
            <Button variant="ghost">Hover for Tooltip</Button>
          </Tooltip>

          <Button
            variant="secondary"
            onClick={() =>
              toast({
                type: 'success',
                title: 'Game Joined!',
                description: 'You are registered for Marina Beach Badminton.',
              })
            }
          >
            Trigger Success Toast
          </Button>

          <Button
            variant="secondary"
            onClick={() =>
              toast({
                type: 'danger',
                title: 'Connection Error',
                description: 'Could not synchronize rating score with server.',
              })
            }
          >
            Trigger Error Toast (8s)
          </Button>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Create Practice Session"
          description="Schedule a practice drill with nearby community players."
        >
          <div className="space-y-4 py-2">
            <FormField label="Session Title">
              <Input defaultValue="Weekend Backhand Practice" />
            </FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setDialogOpen(false)}>
                Schedule
              </Button>
            </div>
          </div>
        </Dialog>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          isDestructive={true}
          title="Cancel Scheduled Match?"
          description="Cancelling within 2 hours of game start incurs a late cancellation penalty on your reliability rating."
          confirmLabel="Cancel Game"
          onConfirm={() => {}}
        />

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title="Filter Discovery Games">
          <div className="space-y-6 pt-4">
            <FormField label="Sport">
              <Select
                value="badminton"
                options={[
                  { value: 'badminton', label: 'Badminton' },
                  { value: 'cricket', label: 'Cricket' },
                  { value: 'football', label: 'Football' },
                ]}
              />
            </FormField>
            <Button variant="primary" className="w-full" onClick={() => setSheetOpen(false)}>
              Apply Filters
            </Button>
          </div>
        </Sheet>
      </section>

      {/* 5. Data Display, Metrics, Tabs & Tables */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          5. Data Display, Cards & Metrics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Current Elo Rating"
            value="1557.1"
            subValue="Advanced Tier"
            trend="up"
            trendText="+42.9 this week"
            icon="trophy"
          />
          <StatCard
            label="Attendance Reliability"
            value="96%"
            subValue="Platinum Tier"
            trend="neutral"
            trendText="12 games counted"
            icon="shield-check"
          />
          <StatCard
            label="Games Hosted"
            value="18"
            subValue="100% completion"
            icon="activity"
          />
          <StatCard
            label="Active Waitlist"
            value="3"
            subValue="Marina Arena"
            icon="clock"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Player Profile Card</CardTitle>
              <CardDescription>Radix Avatar and Progress indicator</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar fallbackText="Demo Player" size="lg" />
                <div>
                  <h4 className="font-semibold text-foreground">Demo Player 1</h4>
                  <p className="text-xs text-muted-foreground">Chennai, TN • Badminton & Cricket</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Reliability Progress to Diamond</span>
                  <span className="font-mono">96 / 100</span>
                </div>
                <Progress value={96} max={100} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tabbed Navigation</CardTitle>
              <CardDescription>Radix Tabs with full arrow-key keyboard navigation</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                items={[
                  {
                    value: 'overview',
                    label: 'Overview',
                    content: (
                      <p className="text-sm text-muted-foreground">
                        All upcoming joined and hosted matches for this weekend.
                      </p>
                    ),
                  },
                  {
                    value: 'ratings',
                    label: 'Ratings Breakdown',
                    content: (
                      <p className="text-sm text-muted-foreground">
                        Detailed Elo calculation history and Margin-of-Victory adjustments.
                      </p>
                    ),
                  },
                  {
                    value: 'reliability',
                    label: 'Reliability',
                    content: (
                      <p className="text-sm text-muted-foreground">
                        On-time attendance records and check-in confirmation history.
                      </p>
                    ),
                  },
                ]}
              />
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <div className="space-y-2 pt-4">
          <h3 className="text-sm font-semibold text-foreground">Community Leaderboard Table</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Sport</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Reliability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono font-bold">#1</TableCell>
                <TableCell className="font-medium">Venkatesh R.</TableCell>
                <TableCell>Badminton</TableCell>
                <TableCell className="font-mono text-primary">1642.0</TableCell>
                <TableCell><Badge variant="success">98%</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono font-bold">#2</TableCell>
                <TableCell className="font-medium">Demo Player 1</TableCell>
                <TableCell>Badminton</TableCell>
                <TableCell className="font-mono text-primary">1557.1</TableCell>
                <TableCell><Badge variant="success">96%</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono font-bold">#3</TableCell>
                <TableCell className="font-medium">Ananya S.</TableCell>
                <TableCell>Badminton</TableCell>
                <TableCell className="font-mono text-primary">1480.5</TableCell>
                <TableCell><Badge variant="success">94%</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      {/* 6. Feedback, Skeletons & Patterns */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          6. Feedback States, Skeletons & Stepper
        </h2>
        <div className="space-y-6">
          <Stepper
            steps={[
              { id: 1, title: 'Basic Info' },
              { id: 2, title: 'Sport Selection' },
              { id: 3, title: 'Availability' },
              { id: 4, title: 'Review' },
            ]}
            activeStep={stepperStep}
            onStepClick={setStepperStep}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EmptyState
              icon="search"
              title="No upcoming matches found"
              description="Try expanding your search radius or adjusting sport format filters."
              actionLabel="Reset Filters"
              onAction={() => {}}
            />

            <ErrorState
              title="Failed to load match recommendations"
              errorCode="AI_SERVICE_UNAVAILABLE"
              message="The recommendation service is temporarily unavailable."
              onRetry={() => {}}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Loading Skeleton Preview</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          </div>

          <LoadMore onLoadMore={() => {}} isLoading={false} hasMore={true} />
        </div>
      </section>
    </PageLayout>
  );
}

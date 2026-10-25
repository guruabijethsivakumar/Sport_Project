# PlayMatch: Comprehensive Project Learning Guide, Technical Architecture & Professor Demo Runbook

> **Target Audience:** Engineering Team & University Evaluators  
> **Repository:** `d:/Sports_Project/Sport_Project`  
> **Monorepo Structure:** `server` (Node.js/Express/TypeScript + MongoDB Atlas), `apps/web` (React 18 + Vite + TailwindCSS + TanStack Query), `packages/shared` (Typed API client, live adapters, domain hooks).

---

## Table of Contents
1. [Executive Architecture & Tech Stack](#1-executive-architecture--tech-stack)
2. [Database Engineering & Storage Architecture](#2-database-engineering--storage-architecture)
3. [Complete API Inventory (96 Endpoints)](#3-complete-api-inventory-96-endpoints)
4. [Feature-by-Feature Code Reference & Snippets](#4-feature-by-feature-code-reference--snippets)
   - [Feature 1: Authentication, Session Rotation & Password Security](#feature-1-authentication-session-rotation--password-security)
   - [Feature 2: 5-Step Player Onboarding & Sports Skill Profile](#feature-2-5-step-player-onboarding--sports-skill-profile)
   - [Feature 3: Venue & Multi-Court Slot Management](#feature-3-venue--multi-court-slot-management)
   - [Feature 4: Game Creation Wizard & Geospatial Discovery Feed](#feature-4-game-creation-wizard--geospatial-discovery-feed)
   - [Feature 5: Atomic Concurrency & Race-Condition-Free Seat Claiming](#feature-5-atomic-concurrency--race-condition-free-seat-claiming)
   - [Feature 6: Automated Snake-Draft Team Balancing](#feature-6-automated-snake-draft-team-balancing)
   - [Feature 7: Match Stakes Predictor & Prospective Elo Calculations](#feature-7-match-stakes-predictor--prospective-elo-calculations)
   - [Feature 8: Score Reporting, Verification & Dispute Resolution](#feature-8-score-reporting-verification--dispute-resolution)
   - [Feature 9: Elo Rating Engine with Margin-of-Victory (MoV)](#feature-9-elo-rating-engine-with-margin-of-victory-mov)
   - [Feature 10: Player Attendance Reliability & Behavioral Scoring](#feature-10-player-attendance-reliability--behavioral-scoring)
   - [Feature 11: Algorithmic Explainability & Audit Decision Logs](#feature-11-algorithmic-explainability--audit-decision-logs)
   - [Feature 12: Real-Time WebSocket Push & In-App Notification Drawer](#feature-12-real-time-websocket-push--in-app-notification-drawer)
5. [3-Member Team Division of Work & Responsibilities](#5-3-member-team-division-of-work--responsibilities)
6. [Professor Demo Runbook & Presentation Script](#6-professor-demo-runbook--presentation-script)
   - [Demo Personas & Credentials](#demo-personas--credentials)
   - [Step-by-Step Live Demo Flow](#step-by-step-live-demo-flow)
   - [Anticipated Professor Questions & Technical Defenses](#anticipated-professor-questions--technical-defenses)

---

## 1. Executive Architecture & Tech Stack

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT LAYER (apps/web)                              │
│  React 18 + Vite + TypeScript + TailwindCSS + TanStack React Query + Socket.IO  │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ REST HTTPS / WSS
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                           API GATEWAY & ENGINE (server)                          │
│  Express.js + TypeScript + Helmet + JWT RateLimiter + Domain Events Emitter     │
│  Rating Engine (Elo) • Snake-Draft Balancer • Recommendation & Explainability   │
└──────────────────┬───────────────────────────────────────────┬───────────────────┘
                   │ Mongoose ODM / Transactions               │ WebSockets
┌──────────────────▼──────────────────┐       ┌────────────────▼───────────────────┐
│     DATABASE (MongoDB Atlas)        │       │       REAL-TIME EVENT BUS          │
│ 20 Models • 2dsphere Geo-Indexes    │       │ Per-User Isolated WebSocket Rooms  │
│ Atomic Multi-Document Transactions  │       │ Instant Notification Broadcasts    │
└─────────────────────────────────────┘       └────────────────────────────────────┘
```

- **Frontend (`apps/web`)**: React 18 SPA built with Vite. Styling uses Vanilla TailwindCSS with custom design tokens for light/dark mode glassmorphism. Server state is managed via TanStack React Query (`v5`) with strict query-key invalidation. Zero mock data in production builds—all data is backed by MongoDB Atlas.
- **Shared Foundation (`packages/shared`)**: Contract-first architecture. OpenAPI client generated from backend schema, typed live adapters, and custom React Query hooks (`feature-hooks.ts`).
- **Backend Server (`server`)**: Express.js with modular routing, middleware pipelines (JWT authentication, role authorization, rate limiting, request validation), domain event bus (`EventEmitter`), and background sweeper jobs.
- **Database (`MongoDB Atlas`)**: Relational-grade schema design on a document database using Mongoose 8. Includes multi-document transactions, geospatial indexing, TTL indexes, and atomic compare-and-swap operations.

---

## 2. Database Engineering & Storage Architecture

The application defines **20 distinct collections and Mongoose models** designed with specific relational patterns, embedded subdocuments, and indexing strategies.

### Collection & Model Breakdown

| Collection Name | Model File (`server/src/models/`) | Core Responsibility | Key Indexes & Relations |
| :--- | :--- | :--- | :--- |
| `users` | `user.model.ts` | Identity, email, role (`player`, `venue_owner`, `admin`), bcrypt password hash, lock status. | Unique `email`. Tracks failed login attempts and lockout timestamps. |
| `profiles` | `profile.model.ts` | Player profile details, bio, home location (GeoJSON Point), travel radius, onboarding steps. | `2dsphere` index on `homeLocation`. Indexed reference to `users`. |
| `sports` | `sport.model.ts` | Platform sports catalog (Badminton, Cricket, Football), skill bands (Beginner, Intermediate, Advanced), scoring rules. | Unique `key`. Defines player limits and rating boundaries. |
| `sportprofiles` | `sport-profile.model.ts` | User-specific sport preferences, self-assessed band, play style, positions. | Compound unique index `{ user: 1, sport: 1 }`. |
| `ratings` | `rating.model.ts` | Player Elo ratings per sport (current rating, peak rating, games played, wins, losses). | Compound index `{ user: 1, sport: 1 }`. Rating scale (default 1200, min 100, max 3000). |
| `ratingevents` | `rating-event.model.ts` | Immutable historical ledger of rating changes following match verification. | Compound index `{ user: 1, sport: 1, createdAt: -1 }`. References `matchResultId`. |
| `games` | `game.model.ts` | Game entity: sport, format, host, venue, court, status, join policy, participant and waitlist counts. | `2dsphere` index on `location.coordinates`, compound index on `{ status: 1, startsAt: 1 }`. |
| `gameparticipants` | `game-participant.model.ts` | Junction collection for match rosters. Tracks status (`joined`, `requested`, `waitlisted`, `left`). | Compound unique index `{ gameId: 1, userId: 1 }` prevents double-joining. |
| `gameevents` | `game-event.model.ts` | Append-only audit log of match actions (`participant_joined`, `teams_generated`, etc.). | Compound index `{ gameId: 1, createdAt: 1 }` powers the match timeline. |
| `gameteamformations` | `game-team-formation.model.ts` | Persisted team rosters generated by the snake draft balancer with Elo metrics. | Indexed by `gameId`. Stores side A and side B player arrays and rating diff. |
| `matchresults` | `match-result.model.ts` | Submitted and verified game scores, winner/loser sides, submitter ID, verification status. | References `gameId`. Tracks confirmation workflow. |
| `gamefeedbacks` | `game-feedback.model.ts` | Post-game peer feedback on attendance, punctuality, and sportsmanship. | Compound unique index `{ gameId: 1, fromUser: 1, toUser: 1 }`. |
| `playerreliabilities` | `player-reliability.model.ts` | Attendance score (0–100%), attendance counts, no-shows, late cancellations, tier badge. | Unique index on `userId`. Tier badges: Bronze (<70%), Silver (70–84%), Gold (85–94%), Platinum (95–100%). |
| `venues` | `venue.model.ts` | Physical venues, owner, address, coordinates, amenities, operating hours, courts subdocuments. | `2dsphere` on `location.coordinates`. Embedded `courts` array with individual pricing/surfaces. |
| `courtguards` | `court-guard.model.ts` | Concurrency locks preventing overlapping court bookings across games. | Compound unique index `{ venueId: 1, courtId: 1, startsAt: 1, endsAt: 1 }`. |
| `notifications` | `notification.model.ts` | In-app notification documents (type, title, message, read flag, metadata payload). | Compound index `{ user: 1, read: 1, createdAt: -1 }`. TTL index for auto-cleanup. |
| `decisionlogs` | `decision-log.model.ts` | Algorithmic audit trail explaining eligibility checks, team balancing, and recommendations. | Compound index `{ user: 1, decisionType: 1, createdAt: -1 }`. |
| `refreshsessions` | `refresh-session.model.ts` | Active refresh tokens with device info, IP, and revocation status. | TTL index on `expiresAt` automatically evicts expired sessions. |
| `onetimetokens` | `one-time-token.model.ts` | Short-lived tokens for password resets and email verification. | TTL index on `expiresAt`. Hash-stored tokens. |

### Concurrency & Transactional Safety

```ts
// server/src/services/game-participant.service.ts
const session = await mongoose.startSession();
const eventBuffer = new TransactionEventBuffer();
try {
  await session.withTransaction(async () => {
    // 1. Atomic Compare-And-Swap seat claim
    const updatedGame = await Game.findOneAndUpdate(
      { _id: game._id, participantCount: { $lt: game.maxPlayers } },
      { $inc: { participantCount: 1 } },
      { new: true, session }
    );
    if (!updatedGame) throw new ConflictError('Game is full');

    // 2. Persist participant in same atomic transaction
    await GameParticipant.create([{ gameId, userId, status: 'joined' }], { session });

    // 3. Buffer domain event (emitted ONLY after transaction commits)
    eventBuffer.buffer({ type: GameEventTypes.PARTICIPANT_JOINED, gameId, actorId });
  });
} finally {
  await session.endSession();
}
eventBuffer.commit(); // Dispatches domain events and WebSocket pushes
```

1. **Multi-Document ACID Transactions**: Join requests, team formation, and score verifications run inside `session.withTransaction()`. If any step fails, changes roll back completely.
2. **Atomic CAS (Compare-And-Swap)**: Game seats use `$inc: { participantCount: 1 }` combined with `{ participantCount: { $lt: maxPlayers } }` in the query filter. This prevents overbooking without locking entire tables.
3. **Two-Phase Post-Commit Event Dispatch**: The custom `TransactionEventBuffer` prevents phantom WebSocket notifications by buffering events during the transaction and dispatching them only when the transaction successfully commits.
4. **Geospatial Proximity**: Player discovery and venue lookups use MongoDB's `$near` and `$geoWithin` operators on `2dsphere` indexes, calculating spherical distances in meters.

---

## 3. Complete API Inventory (96 Endpoints)

The server exposes **96 API operations across 90 endpoint paths**, organized into 15 business domains:

```
Total Operations: 96
├── Auth & Identity (12 APIs)
├── Sports Catalog (4 APIs)
├── Player Profile & Onboarding (10 APIs)
├── Ratings & Leaderboards (7 APIs)
├── Games & Discovery (16 APIs)
├── Teams & Balancing (2 APIs)
├── Match Results & Verification (4 APIs)
├── Venues & Court Management (14 APIs)
├── Reliability & Peer Feedback (4 APIs)
├── Decision Explainability (6 APIs)
├── AI Recommendations (1 API)
├── Notifications & Real-Time (3 APIs)
├── Admin Operations (11 APIs)
└── System Health (2 APIs)
```

### Detailed Endpoint Catalog

| Domain | Method | Endpoint Path | Roles Required | Purpose / Description |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/register` | Public | Register new player or venue owner account |
| | `POST` | `/api/v1/auth/login` | Public | Authenticate with email/password; yields JWT + HTTP-only refresh cookie |
| | `POST` | `/api/v1/auth/refresh` | Public | Rotate refresh token and issue fresh access token |
| | `POST` | `/api/v1/auth/logout` | Authenticated | Revoke refresh session and clear cookies |
| | `POST` | `/api/v1/auth/forgot-password` | Public | Request password reset token via email link |
| | `POST` | `/api/v1/auth/reset-password` | Public | Reset password using one-time token |
| | `POST` | `/api/v1/auth/verify-email` | Public | Validate email address with token |
| | `POST` | `/api/v1/auth/change-password` | Authenticated | Update password with existing password validation |
| | `GET` | `/api/v1/auth/sessions` | Authenticated | List all active login sessions for user |
| | `DELETE`| `/api/v1/auth/sessions/:id` | Authenticated | Revoke a specific remote device session |
| | `DELETE`| `/api/v1/auth/sessions` | Authenticated | Revoke all other active sessions |
| | `GET` | `/api/v1/auth/me` | Authenticated | Return current session identity and roles |
| **Profile** | `GET` | `/api/v1/profile` | Authenticated | Retrieve authenticated user's profile and sports |
| | `PATCH`| `/api/v1/profile` | Authenticated | Update display name, bio, travel radius, privacy |
| | `POST` | `/api/v1/profile/onboarding/step` | Authenticated | Submit progress for onboarding wizard step |
| | `POST` | `/api/v1/profile/onboarding/complete` | Authenticated | Finalize player onboarding and activate discovery |
| | `GET` | `/api/v1/profile/sports` | Authenticated | Get player's enrolled sports and self-assessed bands |
| | `POST` | `/api/v1/profile/sports` | Authenticated | Add or update a sport profile (positions, play style) |
| | `DELETE`| `/api/v1/profile/sports/:sportKey`| Authenticated | Remove an enrolled sport |
| | `GET` | `/api/v1/profiles/:userId` | Public/Auth | View public player profile and badges |
| | `GET` | `/api/v1/profiles` | Public/Auth | Query profiles with pagination and search |
| **Sports** | `GET` | `/api/v1/sports` | Public | List all active sports in the catalog |
| | `GET` | `/api/v1/sports/:key` | Public | Get sport specifications and skill bands |
| | `POST` | `/api/v1/admin/sports` | Admin | Create a new sport definition |
| | `PATCH`| `/api/v1/admin/sports/:key` | Admin | Update sport formats and rules |
| **Ratings** | `GET` | `/api/v1/ratings/me` | Authenticated | Get current user ratings across all sports |
| | `GET` | `/api/v1/ratings/users/:userId` | Authenticated | View another player's rating breakdown |
| | `GET` | `/api/v1/ratings/history` | Authenticated | Rating progression history and events |
| | `POST` | `/api/v1/ratings/preview` | Authenticated | Prospective Elo stake preview before match play |
| | `GET` | `/api/v1/leaderboards/:sportKey` | Authenticated | Sport leaderboard sorted by Elo with filters |
| **Games** | `GET` | `/api/v1/games` | Public/Auth | Search games by coordinates, sport, and date |
| | `POST` | `/api/v1/games` | Authenticated | Create a new match with venue/court selection |
| | `GET` | `/api/v1/games/:id` | Public/Auth | Get full game details, status, and metadata |
| | `PATCH`| `/api/v1/games/:id` | Host/Admin | Update game notes, timing, or settings |
| | `POST` | `/api/v1/games/:id/cancel` | Host/Admin | Cancel game with structured cancellation code |
| | `GET` | `/api/v1/games/:id/timeline` | Authenticated | Chronological match lifecycle audit events |
| | `GET` | `/api/v1/games/:id/roster` | Public/Auth | List joined, requested, and waitlisted players |
| | `POST` | `/api/v1/games/:id/join` | Authenticated | Join match or request approval / join waitlist |
| | `POST` | `/api/v1/games/:id/leave` | Authenticated | Leave match or withdraw join request |
| | `POST` | `/api/v1/games/:id/requests/:userId/approve` | Host | Host approves pending player join request |
| | `POST` | `/api/v1/games/:id/requests/:userId/decline` | Host | Host declines pending player join request |
| | `GET` | `/api/v1/games/my` | Authenticated | List caller's hosted and joined matches |
| | `GET` | `/api/v1/games/invite/:code` | Public/Auth | Look up match preview using 6-character code |
| **Teams** | `GET` | `/api/v1/games/:gameId/teams/suggestion` | Authenticated | Generate balanced teams using snake-draft Elo |
| | `POST` | `/api/v1/games/:gameId/teams/confirm` | Host | Host accepts and locks proposed team rosters |
| **Results**| `POST` | `/api/v1/games/:id/results` | Participant | Submit match score and set outcomes |
| | `GET` | `/api/v1/games/:id/results` | Participant | View submitted scores and verification status |
| | `POST` | `/api/v1/games/:id/results/verify` | Participant | Opposing player confirms submitted score |
| | `POST` | `/api/v1/games/:id/results/dispute` | Participant | Opposing player disputes submitted score |
| **Venues** | `GET` | `/api/v1/venues` | Public | Discover verified venues near coordinates |
| | `GET` | `/api/v1/venues/:id` | Public | Venue details, amenities, courts, and hours |
| | `POST` | `/api/v1/venues` | Venue Owner | Register new sports venue for verification |
| | `PATCH`| `/api/v1/venues/:id` | Owner/Admin | Update venue details and amenities |
| | `POST` | `/api/v1/venues/:id/courts` | Owner/Admin | Add new court to venue with pricing |
| | `PATCH`| `/api/v1/venues/:id/courts/:courtId` | Owner/Admin | Update court surface, sports, or availability |
| | `DELETE`| `/api/v1/venues/:id/courts/:courtId`| Owner/Admin | Remove court from venue |
| | `GET` | `/api/v1/venues/:id/availability` | Public/Auth | Check open court slots for a specific date |
| | `POST` | `/api/v1/venues/:id/closures` | Owner/Admin | Schedule planned court maintenance closures |
| | `GET` | `/api/v1/venues/my` | Venue Owner | List venues owned by authenticated owner |
| **Reliability**|`GET` | `/api/v1/reliability/me` | Authenticated | Caller's attendance reliability score and tier |
| | `GET` | `/api/v1/reliability/users/:userId`| Authenticated | View target player's reliability score and badge |
| | `POST` | `/api/v1/games/:id/feedback` | Participant | Submit peer attendance feedback after match |
| | `GET` | `/api/v1/games/:id/feedback` | Participant | Get feedback status for a completed match |
| **Explain**| `GET` | `/api/v1/explain/games/:id/eligibility` | Authenticated | Explain why caller is eligible or ineligible |
| | `GET` | `/api/v1/explain/games/:id/teams` | Authenticated | Explain team formation algorithm and balance |
| | `GET` | `/api/v1/explain/ratings/:eventId` | Authenticated | Explain Elo points won/lost on a rated match |
| | `GET` | `/api/v1/explain/recommendations/:gameId` | Authenticated | Explain why game appeared in recommendations |
| | `GET` | `/api/v1/explain/decisions` | Authenticated | Retrieve caller's algorithmic decision logs |
| | `GET` | `/api/v1/explain/decisions/:id` | Authenticated | Get full breakdown of a single decision log |
| **Recs** | `GET` | `/api/v1/recommendations` | Authenticated | Personalized games recommended for caller |
| **Notifs** | `GET` | `/api/v1/notifications` | Authenticated | Paginated in-app notifications and unread count |
| | `PATCH`| `/api/v1/notifications/:id/read` | Authenticated | Mark single notification as read |
| | `PATCH`| `/api/v1/notifications/read-all` | Authenticated | Mark all caller's notifications as read |
| **Admin** | `GET` | `/api/v1/admin/overview` | Admin | High-level metrics: users, games, dispute count |
| | `GET` | `/api/v1/admin/users` | Admin | Manage user accounts, status, and role switches |
| | `PATCH`| `/api/v1/admin/users/:id/status` | Admin | Suspend or activate user account |
| | `GET` | `/api/v1/admin/venues/pending` | Admin | Review unverified venue registrations |
| | `POST` | `/api/v1/admin/venues/:id/approve` | Admin | Approve and verify venue for public booking |
| | `POST` | `/api/v1/admin/venues/:id/reject` | Admin | Reject venue registration with reason |
| | `GET` | `/api/v1/admin/disputes` | Admin | View open match score disputes |
| | `POST` | `/api/v1/admin/disputes/:id/resolve` | Admin | Resolve score dispute and re-trigger rating |
| **Health** | `GET` | `/api/v1/health` | Public | System liveness probe |
| | `GET` | `/api/v1/health/detailed` | Public | Database connection and queue latency check |

---

## 4. Feature-by-Feature Code Reference, Lifecycles & Step-by-Step Flows

Each feature below details the complete execution path: from user interaction in the React UI, through network REST / WebSocket contracts, into backend business services, database transactional boundaries, and back to reactive client updates.

---

### Feature 1: Authentication, Session Rotation & Password Security

#### 1. Real-World Scenario & Purpose
Players and venue managers need secure authentication without frequent session expirations. The platform uses short-lived JWT access tokens for stateless API verification alongside rolling, secure HTTP-only refresh tokens persisted in MongoDB to allow seamless background re-authentication and immediate device revocation.

#### 2. Step-by-Step Execution Flow
```
User enters credentials ──> POST /api/v1/auth/login ──> Bcrypt Hash Comparison ──> Generate Access JWT (15m)
                                                            │
UI stores token in memory <── Set-Cookie: refreshToken <────┴──> Persist RefreshSession in MongoDB
        │
Axios attaches 'Bearer <token>' on all requests
        │
If 401 Unauthorized received ──> POST /api/v1/auth/refresh ──> Rotates RefreshSession & yields fresh token
```
1. **User Action (UI):** User submits email and password on `/login`.
2. **API Request:** Frontend calls `POST /api/v1/auth/login` with `{ email, password }`.
3. **Backend Service (`auth.service.ts`):** 
   - Looks up user in `User` collection by lowercase email.
   - Compares plaintext password against `passwordHash` using `bcrypt.compare()` (cost factor 12).
   - Generates a 15-minute signed Access JWT containing `{ userId, role }`.
   - Generates a cryptographically random Refresh Token.
4. **Database State:** Hashes the refresh token and inserts a new document in `refreshsessions` with an automatic TTL expiration index.
5. **Client Session Activation:** Server responds with access token in JSON body and sets `refreshToken` in a secure `HttpOnly`, `SameSite=Lax` cookie. `AuthContext.tsx` stores the user in memory and sets up automatic Axios request interceptors.

#### 3. Code References & Snippets
- **Frontend:** [`apps/web/src/pages/auth/LoginPage.tsx`](file:///d:/Sports_Project/Sport_Project/apps/web/src/pages/auth/LoginPage.tsx), [`apps/web/src/context/AuthContext.tsx`](file:///d:/Sports_Project/Sport_Project/apps/web/src/context/AuthContext.tsx)
```tsx
// apps/web/src/context/AuthContext.tsx: Token Interceptor & Auto-Refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const { data } = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
      setAccessToken(data.data.accessToken);
      originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
      return api(originalRequest);
    }
    return Promise.reject(error);
  }
);
```
- **Backend:** [`server/src/services/auth.service.ts`](file:///d:/Sports_Project/Sport_Project/server/src/services/auth.service.ts)
```ts
// server/src/services/auth.service.ts: Login & Session Rotation
const user = await User.findOne({ email: email.toLowerCase() });
if (!user || !(await passwordService.compare(password, user.passwordHash))) {
  throw new UnauthorizedError('Invalid email or password');
}
const accessToken = tokenService.generateAccessToken({ userId: user._id, role: user.role });
const refreshToken = tokenService.generateRefreshToken({ userId: user._id });
await RefreshSession.create({
  user: user._id,
  tokenHash: hashToken(refreshToken),
  userAgent: req.headers['user-agent'],
  ip: req.ip,
  expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000)
});
```

---

### Feature 2: 5-Step Player Onboarding & Sports Skill Profile

#### 1. Real-World Scenario & Purpose
A competitive sports platform requires players to declare their skill level, geographic location, and weekly availability before joining games. Without these, fair matchmaking and accurate Elo calibration are impossible.

#### 2. Step-by-Step Execution Flow
```
Register ──> ProtectedRoute detects incomplete onboarding ──> Redirects to /onboarding
                                                                       │
Step 1: Basic Info (Name, Bio, Avatar) ──────────> POST /api/v1/profile/onboarding/step (Step 1)
Step 2: Sports Selection & Bands (Badminton, etc) -> POST /api/v1/profile/onboarding/step (Step 2)
Step 3: Availability Matrix (Days & Time Slots) ─> POST /api/v1/profile/onboarding/step (Step 3)
Step 4: Geolocation & Travel Radius (Coordinates)> POST /api/v1/profile/onboarding/step (Step 4)
Step 5: Privacy Controls (Ratings Visibility) ───> POST /api/v1/profile/onboarding/complete
                                                                       │
Database initializes SportProfile & baseline Elo (1200) <──────────────┘
Redirects player to /games Discovery Feed
```
1. **Routing Guard (`ProtectedRoute.tsx`):** If `profile.onboarding.status !== 'completed'`, caller is redirected to `/onboarding`.
2. **Step Submission:** User fills each step; clicking "Next" triggers `POST /api/v1/profile/onboarding/step` with the step key and payload.
3. **Database Updates:** `profile.onboarding.completedSteps` appends the completed step.
4. **Completion (`onboarding.complete`):** 
   - `Profile.onboarding.status` switches to `COMPLETED`.
   - `SportProfile` records are upserted for each selected sport.
   - `Rating` records are initialized with a baseline provisional rating of `1200.0`.
5. **UI Transition:** TanStack Query invalidates `['profile']`, and the player is granted full access to match scheduling and discovery.

#### 3. Code References & Snippets
- **Frontend:** [`apps/web/src/pages/onboarding/OnboardingWizard.tsx`](file:///d:/Sports_Project/Sport_Project/apps/web/src/pages/onboarding/OnboardingWizard.tsx)
```tsx
// apps/web/src/pages/onboarding/OnboardingWizard.tsx
const handleStepSubmit = async (stepPayload: any) => {
  await client.post('/api/v1/profile/onboarding/step', {
    step: steps[currentStepIndex].id,
    payload: stepPayload
  });
  if (currentStepIndex === steps.length - 1) {
    await client.post('/api/v1/profile/onboarding/complete', {});
    navigate('/games');
  } else {
    setCurrentStepIndex((prev) => prev + 1);
  }
};
```
- **Backend:** [`server/src/services/onboarding.service.ts`](file:///d:/Sports_Project/Sport_Project/server/src/services/onboarding.service.ts), [`server/src/services/profile.service.ts`](file:///d:/Sports_Project/Sport_Project/server/src/services/profile.service.ts)
```ts
// server/src/services/profile.service.ts: Complete Onboarding & Initialize Ratings
profile.onboarding.status = OnboardingStatuses.COMPLETED;
profile.onboarding.completedAt = new Date();
await profile.save({ session });

for (const sportSelection of profile.sports) {
  await Rating.findOneAndUpdate(
    { user: userObjectId, sport: sportSelection.sportId },
    { $setOnInsert: { currentRating: 1200, peakRating: 1200, gamesPlayed: 0, wins: 0, losses: 0 } },
    { upsert: true, session }
  );
}
```

---

### Feature 3: Venue & Multi-Court Slot Management

#### 1. Real-World Scenario & Purpose
Venue owners rent out physical courts (e.g. synthetic turf, indoor wooden courts) for matches. Overlapping game scheduling on the same court must be mathematically prohibited at the database level.

#### 2. Step-by-Step Execution Flow
```
Venue Owner registers Venue & Courts ──> Admin Approves Venue ──> Available for Booking
                                                                            │
Host selects Venue + Court + Date/Time in Creation Wizard ──────────────────┘
                 │
POST /api/v1/games ──> Query CourtGuard collection for overlapping ranges
                 │
If start < existing.end AND end > existing.start ──> Throw 409 Conflict Error
                 │
If clean ──> Create CourtGuard lock document inside MongoDB ACID transaction
                 │
Game created & linked to Court ID
```
1. **Court Management (UI):** Venue owner configures court names, surfaces, sport formats, and hourly pricing in `VenueManagementPage.tsx`.
2. **Conflict Verification:** When a match is scheduled for a court between `startsAt` and `endsAt`, `venue.service.ts` queries `CourtGuard`.
3. **Range Collision Query:** Checks `{ startsAt: { $lt: endsAt }, endsAt: { $gt: startsAt } }`.
4. **Lock Creation:** If clear, a `CourtGuard` document is created in the transaction, reserving the court exclusively for that game.

#### 3. Code References & Snippets
- **Frontend:** [`apps/web/src/pages/venues/VenueManagementPage.tsx`](file:///d:/Sports_Project/Sport_Project/apps/web/src/pages/venues/VenueManagementPage.tsx)
- **Backend:** [`server/src/services/venue.service.ts`](file:///d:/Sports_Project/Sport_Project/server/src/services/venue.service.ts), [`server/src/models/court-guard.model.ts`](file:///d:/Sports_Project/Sport_Project/server/src/models/court-guard.model.ts)
```ts
// server/src/services/venue.service.ts: Overlap Guard
const existingGuard = await CourtGuard.findOne({
  venueId,
  courtId,
  status: 'active',
  $or: [{ startsAt: { $lt: requestedEnd }, endsAt: { $gt: requestedStart } }],
});
if (existingGuard) {
  throw new AppError('Court is already reserved for the selected window', HttpStatus.CONFLICT, ErrorCodes.COURT_OVERLAP);
}
await CourtGuard.create([{ venueId, courtId, gameId, startsAt, endsAt }], { session });
```

---

### Feature 4: Game Creation Wizard & Geospatial Discovery Feed

#### 1. Real-World Scenario & Purpose
Players want to find sports matches happening nearby without traveling unreasonable distances. Hosts need a structured wizard to define sport formats, min/max player limits, skill bounds, and approval policies.

#### 2. Step-by-Step Execution Flow
```
Host opens /games/new ──> Step 1: Sport & Format ──> Step 2: Venue, Court & Timeslot ──> Step 3: Join Policy
                                                                                                  │
Database saves Game with GeoJSON Point [lng, lat] <── POST /api/v1/games <────────────────────────┘
                               │
Viewer visits /games Discovery Feed ──> Browser requests navigator.geolocation
                               │
GET /api/v1/games?lng=80.27&lat=13.06&radiusKm=15
                               │
MongoDB executes $near 2dsphere index search ──> Returns sorted by proximity & start time
                               │
UI renders Discovery Feed with live distance badge, spot counters & skill range
```
1. **Creation Wizard (`CreateGamePage.tsx`):** Validates required participant bounds (e.g. 6v6 box cricket requires 12 players).
2. **Geospatial Storage:** The game adopts the venue's coordinates formatted as a standard GeoJSON Point: `{ type: 'Point', coordinates: [longitude, latitude] }`.
3. **Discovery Query (`discovery.service.ts`):** Client passes current location; MongoDB runs a `$near` query on the `2dsphere` index, filtering games within `maxDistance: radiusKm * 1000` meters.
4. **UI Cards:** Rendered with distance indicators ("2.4 km away"), participant progress bars, and join buttons.

#### 3. Code References & Snippets
- **Frontend:** [`apps/web/src/pages/games/CreateGamePage.tsx`](file:///d:/Sports_Project/Sport_Project/apps/web/src/pages/games/CreateGamePage.tsx), [`apps/web/src/pages/games/GamesDiscoveryPage.tsx`](file:///d:/Sports_Project/Sport_Project/apps/web/src/pages/games/GamesDiscoveryPage.tsx)
- **Backend:** [`server/src/services/game.service.ts`](file:///d:/Sports_Project/Sport_Project/server/src/services/game.service.ts), [`server/src/services/discovery.service.ts`](file:///d:/Sports_Project/Sport_Project/server/src/services/discovery.service.ts)
```ts
// server/src/services/discovery.service.ts: Geospatial Query Execution
const query: any = {
  status: GameStatuses.OPEN,
  startsAt: { $gte: now },
  location: {
    $near: {
      $geometry: { type: 'Point', coordinates: [playerLng, playerLat] },
      $maxDistance: maxRadiusKm * 1000,
    },
  },
};
const games = await Game.find(query).limit(50).lean();
```

---

### Feature 5: Atomic Concurrency & Race-Condition-Free Seat Claiming

#### 1. Real-World Scenario & Purpose
When a popular box cricket match with only 1 open seat is displayed to multiple players, two players might click "Join" at the exact same millisecond. The server must guarantee that exactly one player gets the seat and the other is either directed to the waitlist or given a clear notification, without corrupting participant counts.

#### 2. Step-by-Step Execution Flow
```
Player clicks 'Join Match' ──> POST /api/v1/games/:id/join
                                        │
MongoDB starts ACID Transaction (session.withTransaction)
                                        │
Is Join Policy == 'approval'?
   ├── YES: Insert GameParticipant(status='requested') ──> Buffer PARTICIPANT_REQUESTED event ──> Notify Host
   │
   └── NO (Direct Join):
         Execute Atomic CAS: Game.findOneAndUpdate(
           { _id: gameId, participantCount: { $lt: maxPlayers } },
           { $inc: { participantCount: 1 } },
           { session, new: true }
         )
            ├── Seat Claim Succeeded (matched doc != null):
            │     Insert GameParticipant(status='joined')
            │     If participantCount == maxPlayers ──> Game.status = 'FULL'
            │     Buffer PARTICIPANT_JOINED event
            │
            └── Game Full (matched doc == null):
                  Execute Atomic Waitlist Increment:
                  Game.findOneAndUpdate({ _id: gameId, waitlistCount: { $lt: MAX_WAITLIST } }, { $inc: { waitlistCount: 1 } })
                  Insert GameParticipant(status='waitlisted')
                                        │
Session Commits ──> TransactionEventBuffer fires events ──> WebSockets push updates ──> UI refreshes
```

#### 3. Code References & Snippets
- **Frontend:** [`apps/web/src/pages/games/GameDetailsPage.tsx`](file:///d:/Sports_Project/Sport_Project/apps/web/src/pages/games/GameDetailsPage.tsx), [`apps/web/src/components/games/HostControls.tsx`](file:///d:/Sports_Project/Sport_Project/apps/web/src/components/games/HostControls.tsx)
- **Backend:** [`server/src/services/game-participant.service.ts`](file:///d:/Sports_Project/Sport_Project/server/src/services/game-participant.service.ts)
```ts
// server/src/services/game-participant.service.ts: Atomic Seat Claim Transaction
await session.withTransaction(async () => {
  const updatedGame = await Game.findOneAndUpdate(
    { _id: game._id, participantCount: { $lt: game.maxPlayers } },
    { $inc: { participantCount: 1 } },
    { new: true, session }
  );

  if (updatedGame) {
    await GameParticipant.create([{
      gameId: game._id,
      userId: userObjectId,
      role: ParticipantRoles.PLAYER,
      status: ParticipantStatuses.JOINED,
      joinedAt: now
    }], { session });

    eventBuffer.buffer({
      type: GameEventTypes.PARTICIPANT_JOINED,
      gameId: game._id.toString(),
      actorId: userObjectId.toString(),
      data: { hostUserId: game.hostId.toString() }
    });
  } else {
    // Game is full: Join waitlist atomically
    await Game.findByIdAndUpdate(game._id, { $inc: { waitlistCount: 1 } }, { session });
    await GameParticipant.create([{
      gameId: game._id,
      userId: userObjectId,
      status: ParticipantStatuses.WAITLISTED
    }], { session });
  }
});
eventBuffer.commit();
```

---

### Feature 6: Automated Snake-Draft Team Balancing

#### 1. Real-World Scenario & Purpose
Randomly dividing 10 players into two 5-a-side teams leads to unbalanced games where one team dominates. The snake draft balancer distributes players based on their individual Elo ratings to ensure both teams have near-identical average skill.

#### 2. Step-by-Step Execution Flow
```
Match fills to required players ──> Host clicks 'Generate Balanced Teams'
                                              │
GET /api/v1/games/:id/teams/suggestion
                                              │
Backend fetches all joined participants & their current Elo for game.sportKey
                                              │
Algorithm sorts players descending: [1450, 1380, 1320, 1280, 1210, 1150]
                                              │
Snake Draft Execution:
  Round 1 (Pick 1 & 2): Team 1 gets #1 (1450) ── Team 2 gets #2 (1380)
  Round 2 (Pick 3 & 4): Team 2 gets #3 (1320) ── Team 1 gets #4 (1280)
  Round 3 (Pick 5 & 6): Team 1 gets #5 (1210) ── Team 2 gets #6 (1150)
                                              │
Totals: Team 1 = 3940 (Avg 1313.3) | Team 2 = 3850 (Avg 1283.3) | Delta = 30.0 Elo
                                              │
Host reviews proposed rosters in TeamFormationSection.tsx ──> Clicks 'Confirm Teams'
                                              │
POST /api/v1/games/:id/teams/confirm ──> Persists GameTeamFormation & locks rosters
```

#### 3. Code References & Snippets
- **Frontend:** [`apps/web/src/components/teams/TeamFormationSection.tsx`](file:///d:/Sports_Project/Sport_Project/apps/web/src/components/teams/TeamFormationSection.tsx)
- **Backend:** [`server/src/engine/team/snake-draft-balancer.ts`](file:///d:/Sports_Project/Sport_Project/server/src/engine/team/snake-draft-balancer.ts), [`server/src/services/team.service.ts`](file:///d:/Sports_Project/Sport_Project/server/src/services/team.service.ts)
```ts
// server/src/engine/team/snake-draft-balancer.ts: Snake Alternation Logic
export function balanceTeamsSnakeDraft(players: DraftPlayerInput[]): SnakeDraftResult {
  const sorted = [...players].sort((a, b) => b.rating - a.rating);
  const team1: DraftTeamPlayer[] = [];
  const team2: DraftTeamPlayer[] = [];

  sorted.forEach((player, index) => {
    const round = Math.floor(index / 2);
    const pickInRound = index % 2;
    // Even round: Team 1 picks first, Team 2 picks second
    // Odd round: Team 2 picks first, Team 1 picks second
    if (round % 2 === 0) {
      if (pickInRound === 0) team1.push(player);
      else team2.push(player);
    } else {
      if (pickInRound === 0) team2.push(player);
      else team1.push(player);
    }
  });

  return {
    teams: [buildTeam('team_1', team1), buildTeam('team_2', team2)],
    balance: { difference: Math.abs(avg(team1) - avg(team2)), method: 'snake_draft_elo' }
  };
}
```

---

### Feature 7: Match Stakes Predictor & Prospective Elo Calculations

#### 1. Real-World Scenario & Purpose
Before stepping onto the court, competitors want to know what is on the line. The stakes card calculates how many Elo points they stand to win or lose based on their team's probability of victory.

#### 2. Step-by-Step Execution Flow
```
User navigates to GameDetailsPage ──> MatchStakesCard component mounts
                                              │
Reactive Query: POST /api/v1/ratings/preview { sportKey, sides: [team1, team2] }
                                              │
Backend rating engine calculates expected scores:
  Team A Average Elo vs Team B Average Elo
  Win Expectancy E_A = 1 / (1 + 10^((RatingB - RatingA) / 400))
                                              │
Simulates 3 Outcomes for Caller:
  1. VICTORY:  +K * (1.0 - E_caller) * MoV_Multiplier  (e.g. +18.4)
  2. DEFEAT:   -K * (E_caller - 0.0) * MoV_Multiplier  (e.g. -13.6)
  3. DRAW:     ±K * (0.5 - E_caller)                   (e.g. +2.4)
                                              │
Frontend renders Gradient Gauge (e.g. Team 1: 54% vs Team 2: 46%) & Color Badges
```

#### 3. Code References & Snippets
- **Frontend:** [`apps/web/src/components/games/MatchStakesCard.tsx`](file:///d:/Sports_Project/Sport_Project/apps/web/src/components/games/MatchStakesCard.tsx)
```tsx
// apps/web/src/components/games/MatchStakesCard.tsx
const { data: preview } = useMatchRatingPreview(client, {
  sportKey: game.sportKey,
  sides: [
    { sideKey: 'team_1', playerIds: team1PlayerIds },
    { sideKey: 'team_2', playerIds: team2PlayerIds }
  ]
});

return (
  <Card className="p-4 border border-border/60 bg-card/80">
    <div className="flex justify-between items-center">
      <Badge variant="success">Victory: +{preview.myStakes.winDelta} Elo</Badge>
      <Badge variant="danger">Defeat: -{preview.myStakes.lossDelta} Elo</Badge>
    </div>
    <WinProbabilityGauge probA={preview.teamAProbability} probB={preview.teamBProbability} />
  </Card>
);
```
- **Backend:** [`server/src/services/rating-engine.service.ts`](file:///d:/Sports_Project/Sport_Project/server/src/services/rating-engine.service.ts), [`server/src/engine/rating/elo.ts`](file:///d:/Sports_Project/Sport_Project/server/src/engine/rating/elo.ts)

---

### Feature 8: Score Reporting, Verification & Dispute Resolution

#### 1. Real-World Scenario & Purpose
Unilateral score reporting leads to falsified match outcomes. PlayMatch implements a two-party confirmation workflow: Team 1 proposes the final score; Team 2 must verify it before any rating adjustments are applied. If the score is wrong, Team 2 disputes it, alerting an administrator.

#### 2. Step-by-Step Execution Flow
```
Match Ends ──> Player A opens SubmitScoreModal ──> Enters 21 - 18 ──> POST /api/v1/games/:id/results
                                                                              │
MatchResult saved (status: 'PROPOSED') ──> Event RESULT_SUBMITTED ────────────┘
                               │
Opposing Player B receives WebSocket alert & sees ResultVerificationBanner on screen
                               │
                       Player B Choice:
         ┌─────────────────────┴──────────────────────┐
         ▼                                            ▼
Clicks "Verify Result"                      Clicks "Dispute Result"
POST /api/v1/games/:id/results/verify       POST /api/v1/games/:id/results/dispute
         │                                            │
Status: 'CONFIRMED'                         Status: 'DISPUTED'
Triggers applyMatchResult() in Elo Engine   Rating execution BLOCKED
Ratings & Peak Ratings updated in MongoDB   Admin notified for manual review
```

#### 3. Code References & Snippets
- **Frontend:** [`apps/web/src/components/results/SubmitScoreModal.tsx`](file:///d:/Sports_Project/Sport_Project/apps/web/src/components/results/SubmitScoreModal.tsx), [`apps/web/src/components/results/ResultVerificationBanner.tsx`](file:///d:/Sports_Project/Sport_Project/apps/web/src/components/results/ResultVerificationBanner.tsx)
- **Backend:** [`server/src/services/game-result.service.ts`](file:///d:/Sports_Project/Sport_Project/server/src/services/game-result.service.ts)
```ts
// server/src/services/game-result.service.ts: Verification & Rating Execution Trigger
if (action === 'verify') {
  matchResult.status = MatchStatuses.CONFIRMED;
  matchResult.verifiedBy = userObjectId;
  matchResult.verifiedAt = now;
  await matchResult.save({ session });

  // Atomic Trigger into Elo Engine
  await ratingEngineService.applyMatchResult({
    sportKey: game.sportKey,
    source: { type: 'game', id: game._id.toString() },
    sides: matchResult.sides
  }, session);

  eventBuffer.buffer({ type: GameEventTypes.RESULT_VERIFIED, gameId: game._id.toString() });
}
```

---

### Feature 9: Elo Rating Engine with Margin-of-Victory (MoV)

#### 1. Real-World Scenario & Purpose
Standard Elo was designed for 1v1 chess. In team sports (Badminton, Cricket, Football), the engine must aggregate team skill, prevent runaway point inflation in blowout matches, and account for player experience levels.

#### 2. Step-by-Step Execution Flow
```
Confirmed Match Scores Received ──> ratingEngineService.applyMatchResult()
                                                │
1. Team Aggregator calculates Team 1 & Team 2 average ratings
2. Margin of Victory Multiplier calculated:
     MoV = ln(|ScoreDiff| + 1) * (2.2 / ((WinnerElo - LoserElo)*0.001 + 2.2))
3. For each player:
     Determine K-Factor (Provisional < 10 games: K=32; Established: K=16; Inactivity boost)
     Expected Score E = 1 / (1 + 10^((OpponentTeamRating - PlayerRating) / 400))
     Rating Delta = Round(K * (ActualScore - E) * MoV)
4. Update Rating document: currentRating, peakRating, gamesPlayed++, wins/losses++
5. Append immutable RatingEvent audit document in MongoDB
```

#### 3. Code References & Snippets
- **Frontend:** [`apps/web/src/pages/profile/ProfilePage.tsx`](file:///d:/Sports_Project/Sport_Project/apps/web/src/pages/profile/ProfilePage.tsx), [`apps/web/src/pages/leaderboard/LeaderboardPage.tsx`](file:///d:/Sports_Project/Sport_Project/apps/web/src/pages/leaderboard/LeaderboardPage.tsx)
- **Backend:** [`server/src/engine/rating/index.ts`](file:///d:/Sports_Project/Sport_Project/server/src/engine/rating/index.ts), [`server/src/engine/rating/mov.ts`](file:///d:/Sports_Project/Sport_Project/server/src/engine/rating/mov.ts)
```ts
// server/src/engine/rating/index.ts: Master Calculation Loop
for (const player of sideA.players) {
  const expectedScore = calculateExpectedScore(player.rating, teamRatingB, config.scaleDivisor);
  const kResolution = determineKFactor(player.gamesPlayed, player.lastRatedAt, currentDate, config);
  const rawDelta = kResolution.kFactor * (outcomeScoreA - expectedScore) * movMultiplier;
  const newRating = clampAndRoundRating(player.rating + rawDelta, config.minRating, config.maxRating);

  results.push({
    userId: player.userId,
    oldRating: player.rating,
    newRating,
    delta: Math.round((newRating - player.rating) * 10) / 10,
    expectedScore,
    bandAfter: resolveBandLabel(newRating, skillBands)
  });
}
```

---

### Feature 10: Player Attendance Reliability & Behavioral Scoring

#### 1. Real-World Scenario & Purpose
Recreational sports networks fail when players drop out at the last minute or fail to show up. PlayMatch tracks attendance reliability as a first-class metric, rewarding committed players with badges (`Platinum`, `Gold`, `Silver`, `Bronze`).

#### 2. Step-by-Step Execution Flow
```
Match Completes ──> AttendanceFeedbackModal triggers for participants
                               │
Peer Feedback: Was Player X Present? On-Time? No-Show? Late Cancellation?
                               │
POST /api/v1/games/:id/feedback
                               │
Reliability Engine calculates score:
  Score = Clamp_0_100( ((Attended - (LateCancels * 0.5) - (NoShows * 2.0)) / TotalGames) * 100 )
                               │
Tier Assigned:
  Score >= 95% ──> PLATINUM (100% Reliable)
  Score >= 85% ──> GOLD
  Score >= 70% ──> SILVER
  Score < 70%  ──> BRONZE (High Risk)
                               │
PlayerReliability document updated ──> ReliabilityBadge renders across all match rosters
```

#### 3. Code References & Snippets
- **Frontend:** [`apps/web/src/components/profile/ReliabilityBadge.tsx`](file:///d:/Sports_Project/Sport_Project/apps/web/src/components/profile/ReliabilityBadge.tsx), [`apps/web/src/components/profile/AttendanceFeedbackModal.tsx`](file:///d:/Sports_Project/Sport_Project/apps/web/src/components/profile/AttendanceFeedbackModal.tsx)
- **Backend:** [`server/src/services/reliability.service.ts`](file:///d:/Sports_Project/Sport_Project/server/src/services/reliability.service.ts)
```ts
// server/src/services/reliability.service.ts: Reliability Computation
const netAttendance = Math.max(0, attendedCount - (lateCancellations * 0.5) - (noShows * 2.0));
const rawScore = totalCommitted > 0 ? (netAttendance / totalCommitted) * 100 : 100;
const score = Math.round(Math.min(100, Math.max(0, rawScore)));

let tier: ReliabilityTier = 'bronze';
if (score >= 95) tier = 'platinum';
else if (score >= 85) tier = 'gold';
else if (score >= 70) tier = 'silver';

await PlayerReliability.findOneAndUpdate(
  { userId },
  { score, tier, attendedCount, noShows, lateCancellations, updatedAt: new Date() },
  { upsert: true, new: true }
);
```

---

### Feature 11: Algorithmic Explainability & Audit Decision Logs

#### 1. Real-World Scenario & Purpose
When players are blocked from joining a match or wonder why their rating changed, generic error messages like "You cannot join" cause frustration. The explainability engine breaks down the decision into positive and negative checks.

#### 2. Step-by-Step Execution Flow
```
User clicks "Explain Why I'm Ineligible" on match card
                      │
GET /api/v1/explain/games/:id/eligibility
                      │
Explainability Engine evaluates rule checks in memory:
  Check 1: Is user enrolled in game.sportKey? (PASSED / FAILED)
  Check 2: Is user rating within game.ratingRange [min, max]? (PASSED / FAILED)
  Check 3: Does user have an overlapping game at that timeslot? (PASSED / FAILED)
  Check 4: Is user account active and verified? (PASSED / FAILED)
                      │
Builds Structured Response: { eligible: false, summary: "Outside rating range", rulesEvaluated: [...] }
                      │
DecisionExplanationModal opens: Shows status banner, icon indicators & resolution steps
```

#### 3. Code References & Snippets
- **Frontend:** [`apps/web/src/components/explain/DecisionExplanationModal.tsx`](file:///d:/Sports_Project/Sport_Project/apps/web/src/components/explain/DecisionExplanationModal.tsx)
```tsx
// apps/web/src/components/explain/DecisionExplanationModal.tsx
const { data: explanation } = useExplainEligibility(client, gameId, { enabled: isOpen });

return (
  <Modal isOpen={isOpen} onClose={onClose} title="Decision Explainability Breakdown">
    <div className={explanation.eligible ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}>
      {explanation.summary}
    </div>
    <div className="space-y-3 mt-4">
      {explanation.rulesEvaluated.map((rule) => (
        <div key={rule.ruleId} className="flex items-center justify-between p-2 rounded bg-muted/40">
          <span>{rule.name}</span>
          <Badge variant={rule.passed ? "success" : "danger"}>{rule.passed ? "Passed" : "Violated"}</Badge>
        </div>
      ))}
    </div>
  </Modal>
);
```
- **Backend:** [`server/src/services/explainability.service.ts`](file:///d:/Sports_Project/Sport_Project/server/src/services/explainability.service.ts)

---

### Feature 12: Real-Time WebSocket Push & In-App Notification Drawer

#### 1. Real-World Scenario & Purpose
When a player requests to join an approval-required game, the host needs an immediate in-app push notification without manually refreshing the browser. The system uses per-user authenticated WebSocket rooms and MongoDB notification persistence.

#### 2. Step-by-Step Execution Flow
```
Player submits Join Request ──> PARTICIPANT_REQUESTED domain event committed
                                               │
Notification Service handles event ──> Checks: (hostUserId != actorId)
                                               │
1. Inserts document into 'notifications' collection (user = hostId, read = false)
2. Calls emitToUser(hostId, eventPayload)
                                               │
Socket.IO emits strictly to private room: socket.to(hostId).emit('notification', payload)
                                               │
Host browser receives event ──> Notification badge increments ──> Audio chime / toast
                                               │
Host clicks Bell Icon ──> NotificationDrawer opens (React Portal) ──> Displays action link
```

#### 3. Code References & Snippets
- **Frontend:** [`apps/web/src/components/notifications/NotificationDrawer.tsx`](file:///d:/Sports_Project/Sport_Project/apps/web/src/components/notifications/NotificationDrawer.tsx)
```tsx
// apps/web/src/components/notifications/NotificationDrawer.tsx
export function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const { data } = useNotifications();
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <aside className="w-full max-w-md h-full bg-card border-l border-border flex flex-col">
        <header className="p-4 border-b flex justify-between items-center">
          <h3>Notifications ({data?.unreadCount || 0} unread)</h3>
          <Button variant="ghost" onClick={onClose} icon={<XIcon />} />
        </header>
        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3">
          {data?.notifications.map((n) => (
            <NotificationCard key={n.id} notification={n} />
          ))}
        </div>
      </aside>
    </div>,
    document.body
  );
}
```
- **Backend:** [`server/src/services/notification.service.ts`](file:///d:/Sports_Project/Sport_Project/server/src/services/notification.service.ts), [`server/src/engine/websockets/index.ts`](file:///d:/Sports_Project/Sport_Project/server/src/engine/websockets/index.ts)
```ts
// server/src/services/notification.service.ts: Guarded Target Push
function handleParticipantRequested(event: DomainEventPayload): void {
  const data = event.data as { hostUserId?: string; playerName?: string; gameName?: string };
  // Target only host; prevent notifying applicant about their own request
  if (data?.hostUserId && data.hostUserId !== event.actorId) {
    createAndEmit({
      userId: data.hostUserId,
      type: NotificationTypes.GAME_INVITATION,
      title: 'Join Request Received',
      message: `${data.playerName || 'A player'} has requested to join ${data.gameName || 'your match'}.`,
      data: { gameId: event.gameId, actorId: event.actorId }
    });
  }
}
```

---

---

## 5. 3-Member Team Division of Work & Responsibilities

| Role | Team Member | Primary Domain | Backend Files Owned | Frontend Files Owned |
| :--- | :--- | :--- | :--- | :--- |
| **Member 1** | *Foundations & Identity* | Auth, Security, Profiles, Onboarding, Venues, Design System | `auth.service.ts`<br>`profile.service.ts`<br>`venue.service.ts`<br>`user.model.ts`<br>`venue.model.ts` | `src/index.css`<br>`tailwind.config.ts`<br>`pages/auth/**`<br>`pages/onboarding/**`<br>`pages/profile/**`<br>`pages/venues/**` |
| **Member 2** | *Matchmaking & Lifecycle* | Game Creation, Discovery Feed, Concurrency, Host Controls, Teams | `game.service.ts`<br>`discovery.service.ts`<br>`game-participant.service.ts`<br>`team.service.ts`<br>`admin.service.ts` | `pages/games/CreateGamePage.tsx`<br>`pages/games/GamesDiscoveryPage.tsx`<br>`pages/games/GameDetailsPage.tsx`<br>`components/teams/**`<br>`pages/admin/**` |
| **Member 3** | *Algorithms & Real-Time* | Elo Engine, Results/Disputes, Reliability, Explainability, Sockets | `rating-engine.service.ts`<br>`game-result.service.ts`<br>`reliability.service.ts`<br>`explainability.service.ts`<br>`notification.service.ts` | `components/results/**`<br>`components/explain/**`<br>`components/notifications/**`<br>`components/games/MatchStakesCard.tsx`<br>`pages/leaderboard/**` |

---

## 6. Professor Demo Runbook & Presentation Script

### Demo Personas & Credentials

All demo accounts share the uniform development password: `Password123!`

| Role / Persona | Email | Purpose in Live Demo |
| :--- | :--- | :--- |
| **Administrator** | `admin@playmatch.demo` | System dashboard, venue approvals, dispute resolution |
| **Host / Player 3** | `player3@playmatch.demo` | Chetan Sharma — hosts Box Cricket match with Approval join policy |
| **Applicant / Player 4** | `player4@playmatch.demo` | Deepa S — requests to join match, views profile & Elo breakdown |
| **Competitor / Player 1** | `player1@playmatch.demo` | Arun Kumar — verified badminton player, high rating & leaderboards |
| **Venue Owner** | `owner2@playmatch.demo` | Chepauk Sports Manager — manages indoor turf & multi-courts |

---

### Step-by-Step Live Demo Flow

```mermaid
sequenceDiagram
    autonumber
    actor M1 as Member 1 (Auth & Venues)
    actor M2 as Member 2 (Games & Teams)
    actor M3 as Member 3 (Results & Elo)
    participant UI as PlayMatch Web App
    participant API as Express API
    participant DB as MongoDB Atlas

    Note over M1,UI: Phase 1: Identity & Venues
    M1->>UI: Logs in as Chepauk Owner & registers multi-court venue
    M1->>UI: Logs in as Deepa S & walks through 5-step onboarding wizard

    Note over M2,UI: Phase 2: Game Scheduling & Snake Draft
    M2->>UI: Logs in as Chetan Sharma & schedules Box Cricket game
    M2->>UI: Demonstrates Geospatial Discovery filters & travel radius
    M2->>UI: Triggers Snake-Draft Team Balancing; shows balanced roster & rating delta

    Note over M3,UI: Phase 3: Live Match Lifecycle & Ratings
    M3->>UI: Deepa S requests to join; Chetan receives real-time notification
    M3->>UI: Opens "What's at Stake?" prospective Elo calculation widget
    M3->>UI: Submits match scores; opponent verifies result
    M3->>UI: Shows Elo points updating live & opens Decision Explainability Modal
```

#### Act 1: Platform Foundation, Architecture & Identity (Member 1 Speaking)
- **Time:** 0:00 – 5:00
- **Action:** Open application at `http://localhost:3000`. Present high-level architecture diagram.
- **Show Auth & Guardrails:** Demonstrate login with `player4@playmatch.demo`. Show how JWT tokens are issued and refresh sessions rotate in MongoDB.
- **Show 5-Step Onboarding Wizard:** Open `/onboarding`. Walk through sports selection, availability sliders, location coordinates, and privacy toggles. Show that incomplete onboarding blocks game discovery.
- **Show Venue & Multi-Court System:** Navigate to `/venues`. Show how courts prevent overlapping bookings using the `CourtGuard` collection.

#### Act 2: Games Engine, Geospatial Discovery & Team Balancing (Member 2 Speaking)
- **Time:** 5:00 – 11:00
- **Show Discovery Feed:** Open `/games`. Show filtering by sport, date, and travel radius using MongoDB `$geoWithin` queries.
- **Show 3-Step Match Creation:** Open `/games/new`. Create a match with format selection, court slot reservation, and an **Approval Required** join policy.
- **Show Concurrency & Roster Management:** Show the live match roster. Explain how the atomic `$inc` prevents race conditions when multiple players click Join simultaneously.
- **Show Snake-Draft Team Balancing:** Click **Generate Balanced Teams**. Show how the algorithm sorts players by rating and snake-drafts them across Team 1 and Team 2 to minimize the rating delta.

#### Act 3: Elo Engine, Score Verification, Explainability & Sockets (Member 3 Speaking)
- **Time:** 11:00 – 17:00
- **Show Live Notification:** Log in as Chetan Sharma (`player3@playmatch.demo`). Click the notification bell to show the **Join Request Received** drawer item pushed via WebSockets.
- **Show "What's at Stake?" Widget:** Open the match details page. Highlight the prospective Elo movement (+18 / -14) and win expectation gauge.
- **Show Score Reporting & Verification:** Open the score modal, submit `21 - 18`, and switch to the opponent to verify the score.
- **Show Algorithmic Explainability Modal:** Click **Explain Decision**. Show the rule-by-rule evaluation explaining why a player was eligible and how ratings shifted.
- **Show Global Leaderboard:** Open `/leaderboard`. Show the updated Elo rankings, win rates, and Platinum/Gold reliability badges.

---

### Anticipated Professor Questions & Technical Defenses

#### Q1: "How do you guarantee two players don't take the final seat in a game at the same millisecond?"
> **Answer:**  
> "We do not rely on in-memory locks or client-side checks. We use MongoDB multi-document ACID transactions combined with an atomic Compare-And-Swap (CAS) update in `server/src/services/game-participant.service.ts`:
> ```ts
> await Game.findOneAndUpdate(
>   { _id: gameId, participantCount: { $lt: game.maxPlayers } },
>   { $inc: { participantCount: 1 } },
>   { session, new: true }
> );
> ```
> If two requests arrive simultaneously, MongoDB's document-level write lock ensures only one transaction finds `{ participantCount: { $lt: maxPlayers } }`. The second transaction receives `null`, aborts, and safely rolls back."

#### Q2: "Why did you implement Snake Draft instead of simple random team assignment?"
> **Answer:**  
> "In competitive recreational sports, random rosters lead to lopsided matches that cause player churn. Our snake-draft balancer in `server/src/engine/team/snake-draft-balancer.ts` sorts players by their sport-specific Elo in descending order. By alternating pick order between rounds:
> - Round 1: Team 1 (Rank 1), Team 2 (Rank 2)
> - Round 2: Team 2 (Rank 3), Team 1 (Rank 4)  
> We mathematically balance both sides, minimizing the total rating difference between rosters."

#### Q3: "How does your Elo rating system prevent score inflation or manipulation?"
> **Answer:**  
> "Our engine in `server/src/engine/rating/index.ts` enforces four safeguards:
> 1. **Dynamic K-Factor:** Provisional players experience larger adjustments (K=32), while established players with many games have smaller adjustments (K=16).
> 2. **Margin-of-Victory Scaling:** Blowout wins have diminishing returns through a logarithmic multiplier, preventing artificial rating inflation.
> 3. **Opponent-Side Verification:** Scores are not applied when submitted. The opposing side must explicitly verify the result, or open a dispute for administrative review.
> 4. **Zero-Sum Balance:** Rating points gained by the winning side equal points forfeited by the losing side, preserving platform rating equilibrium."

#### Q4: "How does your notification system avoid delivering notifications to the wrong user?"
> **Answer:**  
> "All WebSockets authenticate via JWT during handshake in `server/src/engine/websockets/index.ts`. Every socket joins an isolated private room named after the user's `ObjectId`: `socket.join(user._id)`. When an event occurs (e.g., someone requests to join a game), the backend targets only `game.hostId`, emitting strictly to `room(hostId)`."

# PlayMatch ⚽🎾🏸

> **Location-aware, skill-balanced sports matchmaking and venue management platform connecting players, teams, and venues.**

---

## 📁 Repository & Monorepo Structure

PlayMatch is structured as a TypeScript monorepo with clean separation between shared contracts, frontend applications, and the backend service:

```
playmatch/
├── apps/
│   ├── web/                     # React 19 + Vite frontend (Tailwind CSS + Vanilla CSS tokens)
│   │   ├── src/
│   │   │   ├── components/      # Design system, notifications, dialogs, match operations
│   │   │   ├── pages/           # Games, Venues, Recommendations, Leaderboard, Admin, Profile
│   │   │   └── routes/          # Role-guarded application routing
│   │   └── tests/               # Frontend component and integration tests (Vitest + Playwright)
│   └── mobile/                  # React Native mobile client (optional workspace)
├── packages/
│   └── shared/                  # Shared API contracts, models, and TanStack Query hooks
│       ├── src/
│       │   ├── api/             # Generated OpenAPI client & Axios instance
│       │   ├── query/           # TanStack Query custom query & mutation hooks
│       │   └── features/        # Feature adapters (recommendations, teams, results)
├── server/                      # Node.js + Express + TypeScript REST API backend
│   ├── src/
│   │   ├── controllers/         # REST request handlers
│   │   ├── services/            # Core business logic (Elo, Team Balancer, Reliability)
│   │   ├── models/              # Mongoose schemas with multi-doc transaction support
│   │   ├── routes/              # Express API route declarations
│   │   └── scripts/             # Demo dataset seeding and OpenAPI generation
│   ├── tests/                   # Vitest unit & integration test suites
│   └── docs/                    # Backend architecture and demo account references
├── docs/                        # Complete technical specifications & runbooks
│   └── PROJECT_LEARNING_GUIDE_AND_DEMO_RUNBOOK.md # Detailed demo runbook & feature guide
└── package.json                 # Monorepo workspace configuration & root scripts
```

---

## 🌟 Key Features & Recent Implementation Updates

### 1. In-App Notification System & Clearing Actions
- **Clear All Notifications**: Users can dismiss all notifications in a single click using the **"Clear all"** action in the notification drawer header.
- **Individual Deletion**: Each notification item features a dedicated trash/delete button to remove specific notifications.
- **Full-Stack Endpoints & Hooks**:
  - `DELETE /api/notifications/clear-all` – clears all notifications for the authenticated user.
  - `DELETE /api/notifications/:id` – securely deletes a single notification belonging to the user.
  - Dedicated TanStack Query mutation hooks (`useClearAllNotifications`, `useClearNotification`) with automatic cache invalidation and unread badge count updates.

### 2. Match Score Submission Gating & Team Validation
- **Strict Pre-requisite Validation**:
  - Score submission is now prevented until balanced teams have been formed and the match reaches its scheduled end time.
  - When teams are not formed, the score section informs players: *"Teams have not been generated yet. Lineups must be finalized before submitting match scores"* and the button is disabled as **"Teams Not Formed"**.
  - When teams are formed but the game is still active, the action button is disabled as **"Available After Match"** with a message displaying the scheduled finish time.
- **Backend API Protection**: The `submitResult` service rejects premature submissions missing an active team formation or submitted before match completion.

### 3. Match Recommendations Engine & UI Refactoring
- **Cleaned Up Branding**: Removed the word "AI" across recommendation headings, empty states, and decision explainability dialogs in favor of clean **"Match Recommendations"**.
- **Resolved Duplicate Suggestions**:
  - Backend recommendation queries strictly filter for public matches (`visibility: 'public'`).
  - Added multi-level deduplication by game ID across candidate generation and client render pipelines.
  - Distinct game notes and match formats are displayed to ensure uniquely recognizable match cards.
- **Theme & Light Mode Compatibility**: Replaced hardcoded dark slate colors with semantic design system tokens (`bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`), delivering clean contrast in both light and dark modes.

### 4. Authentication, Account Status & Admin Workflows
- **Suspended Account Notifications**: Clear, user-friendly error banners on login if an account has been suspended (`Account is suspended`).
- **Consolidated Authentication Flow**: Removed duplicate password reset controls on the login screen to streamline the sign-in experience.
- **Admin Portal**: Fully functional system administration credentials (`admin@playmatch.demo` / `PlayMatchDemo2026!`) for managing venue moderation queues, approving venues, and viewing system logs.

### 5. UI Ergonomics & Responsive Modals
- **Venues Navigation**: Removed redundant global "Host Game Here" banner on the Venues tab, preserving contextual hosting actions within individual venue cards and venue detail pages.
- **Eligibility & Match Fit Tabs**: Fixed tab switching between match eligibility criteria and player match fit breakdowns.
- **Independent Modal Scrolling**: Updated all dialogs and pop-ups with max-height constraints (`max-h-[calc(100vh-2rem)] overflow-y-auto`) to guarantee full visibility and form accessibility across all screen sizes.
- **Leaderboard Integration**: Restored active player ranking metrics, sport filtering, and win/loss records.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.x` or `v22.x`
- **npm**: `v10.x` or higher
- **MongoDB**: Local replica set (or Docker / in-memory replica set for transactions)

### 1. Installation

From the monorepo root:

```bash
# Install root, workspace, and server dependencies
npm run setup
```

### 2. Database & Seeding

PlayMatch requires MongoDB replica set support for transactions:

```bash
# Option A: Start MongoDB with Docker Compose
docker compose up -d

# Option B: Or run local in-memory replica set
cd server && npm run db:memory
```

Seed the database with sports catalog and realistic demo scenarios:

```bash
cd server
npm run seed:sports
npm run seed:demo
```

### 3. Running Locally

You can launch both the API server and the web client concurrently:

```bash
# Terminal 1: Backend API (runs on http://localhost:5000)
npm run server:dev

# Terminal 2: Web Client (runs on http://localhost:3000)
npm --prefix apps/web run dev
```

---

## 👥 Seeded Demo Accounts

All demo accounts use the standard demo password: **`PlayMatchDemo2026!`**

| Email Address | Role | Display Name | Scenario Focus |
| :--- | :--- | :--- | :--- |
| `admin@playmatch.demo` | `admin` | System Admin | Admin moderation, venue approvals, system stats |
| `owner1@playmatch.demo` | `venue_owner` | Marina Operations | Venue management (*Marina Smash Arena*, *Marina Coastal Turf*) |
| `owner2@playmatch.demo` | `venue_owner` | Chepauk Manager | Multi-venue operations & pending venue approvals |
| `player1@playmatch.demo` | `player` | Arun Smash | High-reliability host, advanced badminton (1400 Elo) |
| `player2@playmatch.demo` | `player` | Bhavna P | Host of confirmed match with balanced teams (`snake_draft_elo`) |
| `player3@playmatch.demo` | `player` | Chetan BoxCricket | Host approval join workflow, attendance reporting |
| `player4@playmatch.demo` | `player` | Deepa S | Score submission & active match dispute |
| `player5@playmatch.demo` | `player` | Eashwar N | FIFO waitlist position demonstration |
| `player6@playmatch.demo` | `player` | Farhan K | Reliability scoring & attendance penalty demonstration |

For an in-depth walkthrough of each demo scenario, refer to [docs/PROJECT_LEARNING_GUIDE_AND_DEMO_RUNBOOK.md](docs/PROJECT_LEARNING_GUIDE_AND_DEMO_RUNBOOK.md).

---

## 🧪 Testing & Verification

Run tests across the entire monorepo:

```bash
# Run all tests across shared packages, web app, and backend
npm test

# Run individual test suites
npm run test:server    # Server unit & integration tests (Vitest)
npm run test:web       # Web component & hook tests (Vitest)
npm run test:shared    # Shared feature logic tests

# Check TypeScript type safety across workspaces
npm run typecheck:web
npm --prefix server run typecheck
```

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TanStack Query v5, Lucide React, Tailwind CSS + Vanilla CSS Tokens
- **Backend**: Node.js, Express, TypeScript, Zod, Argon2 / Bcrypt, JSON Web Tokens (JWT)
- **Database**: MongoDB with Mongoose (Replica Sets & Multi-document ACID Transactions)
- **Algorithms**: Glicko-2 / Elo Rating Engine, Snake-Draft Balanced Team Solver, Reliability Scoring Engine
- **Testing**: Vitest, Supertest, Playwright, MongoMemoryServer
- **Architecture**: Monorepo Workspaces, OpenAPI 3.0 Contract Generation, Clock-Injected Deterministic Testing

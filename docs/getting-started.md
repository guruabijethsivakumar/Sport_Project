# Getting Started with PlayMatch

Welcome to the PlayMatch monorepo. This guide gets the **web team** (and backend contributors) up and running in under 15 minutes.

> **Scope note:** This is a web-only development plan. `apps/mobile` is present in the repo but is intentionally excluded from CI and composite scripts. See [§ 9 Mobile](#9-mobile-note) for details.

---

## 1. Prerequisites

| Tool | Minimum version | Check |
|---|---|---|
| **Node.js** | 20.0.0 | `node -v` |
| **npm** | 10.0.0 | `npm -v` |
| **Docker** *(optional)* | any recent | `docker -v` |

No global MongoDB installation is required — the server includes an in-memory MongoDB runner.

---

## 2. One-command setup (recommended)

From the **repo root**, run:

```bash
npm run setup
```

This runs `npm ci` (installs all workspace dependencies) followed by `npm --prefix server ci` (installs server dependencies, which has its own `package-lock.json`). Both steps must complete before starting any service.

> **Why two `ci` commands?** The `server/` directory has its own lockfile and is not part of the npm workspaces install. Running `npm ci` at the root installs `packages/shared`, `apps/web`, and `apps/mobile` (linked). Running `npm --prefix server ci` separately installs the backend.

---

## 3. Environment setup

Copy the example env file into `server/.env`:

```bash
# Windows PowerShell
Copy-Item server\.env.local.example server\.env

# macOS / Linux
cp server/.env.local.example server/.env
```

Key variables (defaults are already set in `.env.local.example`):

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `5000` | Backend port |
| `NODE_ENV` | `development` | |
| `MONGODB_URI` | `mongodb://localhost:27017/playmatch?replicaSet=rs0&directConnection=true` | Points at the in-memory or Docker replica set |
| `JWT_ACCESS_SECRET` | *(generate locally)* | Must be ≥ 32 chars |
| `JWT_REFRESH_SECRET` | *(generate locally)* | Must be ≥ 32 chars |
| `DEMO_PASSWORD` | *(optional)* | If omitted, a secure password is generated and logged once during seeding |
| `CLIENT_WEB_URL` | `http://localhost:3000` | Must match the Vite dev server port |
| `VITE_API_BASE_URL` | *(not needed locally)* | Set in `apps/web/.env` if you change the API port |

> **Safety notice:** PlayMatch refuses `mongodb+srv://` (Atlas) connections during local development and demo seeding. Always use `localhost` or `127.0.0.1`.

---

## 4. Database setup (replica set required)

PlayMatch requires a MongoDB **replica set** for multi-document transactions (game scheduling, ratings, court reservations).

### Option A — Docker (recommended when Docker is available)

```bash
# From repo root
docker compose up -d
```

Stops cleanly with `docker compose down`. Reset with `docker compose down -v`.

### Option B — In-memory runner (no Docker needed)

```bash
# In a dedicated terminal — leave it running
npm --prefix server run db:memory
```

Starts a persistent in-memory MongoDB replica set on port `27017`. Safe for local dev and CI-equivalent testing.

---

## 5. Seed demo data

```bash
# Seed sports catalog (Badminton, Cricket, Football)
npm --prefix server run seed:sports

# Seed demo accounts, venues, courts, games, and ratings
npm --prefix server run seed:demo
```

To reset and reseed:

```bash
npm --prefix server run seed:demo -- --reset
```

### Demo accounts (`@playmatch.demo`)

| Role | Email |
|---|---|
| Admin | `admin@playmatch.demo` |
| Venue owner | `owner@playmatch.demo` |
| Player (badminton, intermediate) | `arun.kumar@playmatch.demo` |
| Player (badminton, beginner) | `priya.sharma@playmatch.demo` |
| Player (cricket, expert) | `rahul.dravid@playmatch.demo` |
| Player (cricket, intermediate) | `deepak.chahar@playmatch.demo` |
| Player (football, advanced) | `karthik.rajan@playmatch.demo` |
| Player (football, expert) | `sunil.chhetri@playmatch.demo` |
| *(+ more)* | see seed output |

**Password:** set via `DEMO_PASSWORD` in `server/.env`, or printed during `seed:demo`.

---

## 6. Run the backend

```bash
# Development mode with hot reload
npm --prefix server run dev

# Or: build then start
npm --prefix server run build && npm --prefix server start
```

Health checks:
- `GET http://localhost:5000/health`
- `GET http://localhost:5000/api/v1/health`

---

## 7. Run the web app

```bash
# Development mode (Vite, hot reload, port 3000)
npm --prefix apps/web run dev
```

Open `http://localhost:3000`. The status page confirms backend connectivity and loads the sports catalog via the shared TanStack Query hook.

---

## 8. Quality checks and CI scripts

All commands below are run from the **repo root**.

### Full composite suites

```bash
npm run setup          # Install everything (run once, or after lockfile changes)
npm test               # packages/shared + apps/web + server tests (mobile excluded)
npm run lint           # packages/shared + apps/web + server lint
npm run build          # apps/web (Vite) + server (tsc)
npm run check:api      # Verify generated.ts matches server/openapi.json
```

### Individual workspace commands

```bash
npm run test:shared    # Vitest for packages/shared
npm run test:web       # Vitest for apps/web
npm run test:server    # Vitest for server (requires db:memory or Docker)

npm run lint:shared
npm run lint:web
npm run lint:server

npm run typecheck:shared
npm run typecheck:web

npm run build:web
npm run build:server

# Regenerate TypeScript types from server/openapi.json
npm run gen:api
```

### OpenAPI type drift

Any time the backend generates a new `server/openapi.json`, the shared generated types must be kept in sync:

```bash
npm run gen:api    # Regenerate src/api/generated.ts
npm run check:api  # Verify no drift (also runs in CI)
```

### Verify single-flight token refresh (against live server)

```bash
# Start db:memory + seed:demo + server first, then:
npx tsx scripts/verify-refresh.ts
```

---

## 9. Mobile note

`apps/mobile` (Expo / React Native) is **present in the repository but out of scope** for the current web-only development plan. It is kept in the `workspaces` list so that `npm ci` at the root links `@playmatch/shared` for any local mobile work.

**What is excluded:**
- `npm test` does **not** run `apps/mobile test` — call `npm run test:mobile` explicitly.
- CI does **not** build or test `apps/mobile`.

**If you want to remove `apps/mobile` from the workspace entirely** (a separate, reversible step):
1. Remove `"apps/*"` or add `"!apps/mobile"` to the `workspaces` array in root `package.json`.
2. Delete the `apps/mobile` entry from `node_modules/@playmatch/mobile` symlink.
3. Run `npm ci` at root.

**Install-size impact of removing mobile from the workspace:**  
The following packages are currently hoisted to root `node_modules` solely because of `apps/mobile`. Removing mobile from the workspace would allow npm to drop them from the root install:

| Package | Size in root `node_modules` |
|---|---|
| `react-native` | ~71.7 MB |
| `jest-expo` | ~10.9 MB |
| `expo-router` | ~1.7 MB |
| `expo-location` | ~0.4 MB |
| `expo` | ~0.3 MB |
| `expo-constants` | ~0.1 MB |
| `expo-secure-store` | ~0.1 MB |
| **Total recoverable** | **~85 MB** |

This would reduce `npm ci` time on CI by approximately 15–30 seconds (download + extraction). It is a reversible git change (revert the `workspaces` edit and re-run `npm ci`).

---

## 10. CI overview

Four jobs run in parallel (shared → web depend on shared completing first):

| Job | What it does |
|---|---|
| `shared` | lint · typecheck · API drift check · test |
| `web` | lint · typecheck · test · vite build *(depends on `shared`)* |
| `server` | npm ci · lint · tsc build · openapi:check · vitest |
| `gitleaks-audit` | Secret and credential scan |

`apps/mobile` is **not a CI job**. See §9 above.

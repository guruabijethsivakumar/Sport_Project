# PlayMatch Deployment & Database Guide

## 1. Environment Configurations

PlayMatch backend connects to MongoDB (either local Docker replica set or MongoDB Atlas) using `MONGODB_URI`.

### Critical Database Environment Variables
| Variable | Required | Description |
| :--- | :--- | :--- |
| `MONGODB_URI` | **Yes** | Standard `mongodb://` or `mongodb+srv://` connection URI. Must include a database name (e.g. `/playmatch`). |
| `ALLOW_REMOTE_DB` | Dev/Test only | Guard against accidental remote DB connections. When `NODE_ENV !== 'production'`, remote or `mongodb+srv://` URIs will fail fast at startup unless `ALLOW_REMOTE_DB=yes` is explicitly set in that environment. |
| `SEED_CONFIRM_REMOTE` | Seeding only | Guard against accidental remote seeding. Seeding remote databases requires `SEED_CONFIRM_REMOTE=yes`. The `--reset` flag is **strictly refused** on all remote targets. |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth 2.0 Web Client ID for Google Identity Services. |

---

## 2. Remote Database Guard (`ALLOW_REMOTE_DB`)

To prevent developers from accidentally pointing their local development or test runners to production/hosted Atlas instances:
- Non-production environments will refuse to start if given a `mongodb+srv://` or non-localhost URI without `ALLOW_REMOTE_DB=yes`.
- Error messages name only the variable `ALLOW_REMOTE_DB` and **never log or print connection strings, credentials, or host details**.

To enable remote database connections in local dev:
```bash
ALLOW_REMOTE_DB=yes npm run dev
```

---

## 3. Remote Seeding Guard (`SEED_CONFIRM_REMOTE`)

When populating remote database targets with demo fixtures:
- `SEED_CONFIRM_REMOTE=yes` must be explicitly passed.
- Database reset (`--reset`) is blocked on remote targets to prevent data destruction.
- All seeded entities (users, sports, venues, courts, games, match results) upsert by stable business keys. Running the seed script multiple times is strictly idempotent and will never double-apply Elo ratings.

```bash
SEED_CONFIRM_REMOTE=yes npm run seed:demo
```

---

## 4. Index Lifecycle Management

- PlayMatch automatically executes `Model.ensureIndexes()` (additive index creation) on server startup.
- It **never** executes destructive `syncIndexes()`.
- Index creation results are logged per model. Startup does not crash if an individual index build fails, but logs clear diagnostics.

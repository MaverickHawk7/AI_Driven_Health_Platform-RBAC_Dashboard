# Design: Phase 1 Deploy Fixes

## 1. Session Secret Hardening

**File:** `server/auth.ts:43`

Current: `secret: sessionSecret || "ecd-dashboard-dev-secret"`

The production guard on line 26-28 throws if `SESSION_SECRET` is missing in prod — good. But the fallback on line 43 still uses a known string. If `isProd` detection fails (e.g., env var typo), sessions are signed with a public secret.

**Fix:** Keep the dev fallback but generate a random one per process instead of a static string:

```
                    ┌──────────────────────────────┐
                    │   SESSION_SECRET env var?     │
                    └──────────┬───────────────────┘
                               │
                    ┌──────────▼───────────────────┐
              yes   │  Use env var value            │
                    └──────────────────────────────┘
                               │ no
                    ┌──────────▼───────────────────┐
              prod? │  THROW (already does this)    │
                    └──────────────────────────────┘
                               │ no (dev)
                    ┌──────────▼───────────────────┐
                    │  crypto.randomUUID()          │
                    │  + warn to console            │
                    └──────────────────────────────┘
```

Sessions won't persist across dev restarts, but that's acceptable in dev.

## 2. Health Check Endpoint

**File:** `server/routes.ts` (add before auth-gated routes)

```
GET /health → 200 { status, db, redis, uptime, timestamp }
```

- Not behind `requireAuth` — must be publicly accessible for load balancers
- Checks DB with a lightweight query (`SELECT 1`)
- Checks Redis ping if configured
- Returns component-level status

```
┌──────────────────────────────────────────────────────┐
│  GET /health                                         │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐         │
│  │   DB    │    │  Redis  │    │  App    │          │
│  │ SELECT 1│    │  PING   │    │ uptime  │          │
│  └────┬────┘    └────┬────┘    └────┬────┘          │
│       │              │              │                │
│       ▼              ▼              ▼                │
│  ┌──────────────────────────────────────────┐       │
│  │  { status: "ok"|"degraded"|"error",     │       │
│  │    db: "connected"|"error",              │       │
│  │    redis: "connected"|"disabled"|"error",│       │
│  │    uptime: 12345,                        │       │
│  │    timestamp: "2026-..." }               │       │
│  └──────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────┘
```

Status logic:
- `"ok"` — all components healthy
- `"degraded"` — Redis down but DB up (app still works)
- `"error"` — DB down (app non-functional)

HTTP status: 200 for ok/degraded, 503 for error.

## 3. Process-Level Error Handling + Graceful Shutdown

**File:** `server/index.ts` (add at top-level, outside the async IIFE)

Three handlers:

```
┌──────────────────────────────────────────────────┐
│  Process Signals                                  │
├───────────────────┬──────────────────────────────┤
│ unhandledRejection│ Log error, do NOT exit       │
│                   │ (Express can survive)         │
├───────────────────┼──────────────────────────────┤
│ uncaughtException │ Log error, exit(1)            │
│                   │ (state is corrupted)          │
├───────────────────┼──────────────────────────────┤
│ SIGTERM / SIGINT  │ Graceful shutdown:            │
│                   │ 1. Stop accepting connections │
│                   │ 2. Close httpServer           │
│                   │ 3. Exit(0)                    │
│                   │ Timeout: 10s forced exit      │
└───────────────────┴──────────────────────────────┘
```

## 4. Response Compression

**File:** `server/index.ts` (add after helmet, before routes)

Install `compression` package. Add middleware:
```typescript
import compression from "compression";
app.use(compression());
```

This handles gzip/brotli automatically based on `Accept-Encoding`.

## 5. Static Asset Cache Headers

**File:** `server/static.ts`

Vite produces hashed filenames for JS/CSS (e.g., `index-abc123.js`). These are safe to cache forever.

```
┌────────────────────────────────────────────────────────┐
│  Cache Strategy                                        │
├────────────────────┬───────────────────────────────────┤
│  /assets/*         │  Cache-Control: public,           │
│  (hashed bundles)  │  max-age=31536000, immutable      │
├────────────────────┼───────────────────────────────────┤
│  index.html        │  Cache-Control: no-cache          │
│  (SPA entry)       │  (always fetch fresh)             │
├────────────────────┼───────────────────────────────────┤
│  Other static      │  Cache-Control: public,           │
│  (images, fonts)   │  max-age=86400 (1 day)            │
└────────────────────┴───────────────────────────────────┘
```

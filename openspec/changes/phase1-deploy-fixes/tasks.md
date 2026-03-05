# Tasks: Phase 1 Deploy Fixes

## Task 1: Harden session secret fallback
- **File:** `server/auth.ts`
- **What:** Replace the hardcoded `"ecd-dashboard-dev-secret"` fallback (line 43) with `crypto.randomUUID()`. Add a `console.warn` in dev when no SESSION_SECRET is set, so developers know sessions won't persist across restarts.
- **Status:** done

## Task 2: Add /health endpoint
- **File:** `server/routes.ts`
- **What:** Add a `GET /health` route BEFORE the `requireAuth` middleware block. It should:
  - Check DB connectivity with a lightweight query (e.g., `SELECT 1` via `storage.pool` or `db.execute`)
  - Check Redis with a ping (import from `./redis`)
  - Return `{ status, db, redis, uptime, timestamp }`
  - HTTP 200 for "ok"/"degraded", 503 for "error"
  - Must NOT require authentication
- **Status:** done

## Task 3: Add process-level error handlers and graceful shutdown
- **File:** `server/index.ts`
- **What:** Add three handlers at the module level (outside the async IIFE):
  - `process.on("unhandledRejection", ...)` — log the error, do not exit
  - `process.on("uncaughtException", ...)` — log the error, exit(1)
  - `process.on("SIGTERM", ...)` and `process.on("SIGINT", ...)` — close `httpServer`, then exit(0) with a 10-second forced-exit timeout
  - The `httpServer` variable needs to be accessible — move its declaration or export it
- **Status:** done

## Task 4: Add response compression
- **Files:** `package.json`, `server/index.ts`
- **What:**
  - Install `compression` and `@types/compression` packages
  - Import and add `app.use(compression())` in `server/index.ts` after helmet but before route/body-parser middleware
- **Status:** done

## Task 5: Add static asset cache headers
- **File:** `server/static.ts`
- **What:** Update `serveStatic` to apply tiered cache headers:
  - `/assets/*` (Vite hashed bundles): `Cache-Control: public, max-age=31536000, immutable`
  - `index.html` (SPA entry): `Cache-Control: no-cache`
  - Other static files: default `express.static` caching (or `max-age=86400`)
  - Use `express.static` with `setHeaders` option for `/assets/`, and set no-cache on the SPA fallback response
- **Status:** done

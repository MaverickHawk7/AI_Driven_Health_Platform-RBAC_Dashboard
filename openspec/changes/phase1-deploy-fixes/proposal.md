# Phase 1: Pre-Deployment Fixes

## Summary

Minimum required fixes before the app can be safely deployed for testing. Addresses security gaps, missing operational endpoints, crash resilience, and static asset performance.

## Motivation

The codebase is architecturally solid but has 5 concrete gaps that would cause problems in any deployment — from a test environment to production. These are all low-effort, high-impact fixes.

## Scope

### In scope
1. Remove hardcoded session secret fallback (security)
2. Add `/health` endpoint with DB + Redis connectivity checks
3. Add process-level error handlers (`unhandledRejection`, `uncaughtException`, `SIGTERM` graceful shutdown)
4. Add gzip/brotli compression middleware
5. Add proper cache headers for static assets (long TTL for hashed bundles, no-cache for HTML)

### Out of scope
- Structured logging (Phase 2)
- Tests / CI/CD (Phase 3)
- Docker setup (Phase 2)
- Database indexes (Phase 2)
- Deployment documentation (Phase 2)

## Risks
- **Compression middleware** adds a dependency (`compression`). Minimal risk — widely used, stable package.
- **Graceful shutdown** changes server lifecycle. Low risk — only triggers on process signals.
- **Cache headers** could cause stale assets if Vite's content hashing is misconfigured. Low risk — Vite hashes by default.

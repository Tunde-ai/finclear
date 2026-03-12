---
phase: 01-production-configuration
plan: 01
subsystem: database
tags: [prisma, supabase, pgbouncer, migrations, stripe, clerk, resend, plaid, vercel]

# Dependency graph
requires: []
provides:
  - "prisma.config.ts using DIRECT_URL for migration-safe database connection"
  - "DEPLOY.md with correct DIRECT_URL references in env vars and migration commands"
  - "External service configuration guide (Stripe, Clerk, Resend, Plaid, Vercel)"
affects: [02-production-configuration, deployment, migrations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prisma CLI uses DIRECT_URL (non-pooled) for migrations; runtime Prisma client uses DATABASE_URL (pooled) — never mix these"

key-files:
  created: []
  modified:
    - prisma.config.ts
    - DEPLOY.md

key-decisions:
  - "prisma.config.ts must use DIRECT_URL (non-pooled Supabase) not DATABASE_URL (PgBouncer) because transaction-mode poolers reject DDL"
  - "DATABASE_URL remains for runtime use in lib/prisma.ts — only the CLI migration config changes"

patterns-established:
  - "Separation of migration connection (DIRECT_URL) vs runtime connection (DATABASE_URL) is mandatory for Supabase + PgBouncer setups"

# Metrics
duration: 5min
completed: 2026-03-12
---

# Phase 01 Plan 01: Production Configuration Summary

**Fixed critical Prisma migration bug (DATABASE_URL -> DIRECT_URL) and updated DEPLOY.md with correct connection string references and PgBouncer explanation**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-12T13:53:57Z
- **Completed:** 2026-03-12T13:58:00Z
- **Tasks:** 1/2 complete (Task 2 awaiting human action at checkpoint)
- **Files modified:** 2

## Accomplishments
- Fixed `prisma.config.ts` datasource to use `DIRECT_URL` instead of `DATABASE_URL` — without this, `prisma migrate deploy` would fail against production Supabase because PgBouncer in transaction mode rejects DDL
- Updated `DEPLOY.md` to list `DIRECT_URL` alongside `DATABASE_URL` in the Database env vars section
- Updated migration and seed commands in `DEPLOY.md` to use `DIRECT_URL`
- Added explanatory note about why PgBouncer requires `DIRECT_URL` for migrations
- Corrected `RESEND_FROM_EMAIL` placeholder to use `finclear.app` domain

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix prisma.config.ts and update DEPLOY.md migration references** - `1f12ea0` (fix)

**Plan metadata:** (pending — checkpoint reached before plan completion)

## Files Created/Modified
- `prisma.config.ts` - Datasource URL changed from `DATABASE_URL` to `DIRECT_URL`
- `DEPLOY.md` - Added `DIRECT_URL` to env vars, updated migration/seed commands, added PgBouncer note

## Decisions Made
- Changed only `prisma.config.ts` datasource (the Prisma CLI config) — `lib/prisma.ts` (runtime client) correctly uses `DATABASE_URL` and was NOT changed
- This separation (DIRECT_URL for migrations, DATABASE_URL for runtime) is the standard Supabase + PgBouncer pattern

## Deviations from Plan

**Rule 2 - Auto-fix: Corrected RESEND_FROM_EMAIL placeholder**
- **Found during:** Task 1 (DEPLOY.md review)
- **Issue:** `RESEND_FROM_EMAIL` still had placeholder `notifications@yourdomain.com` instead of the correct `finclear.app` domain
- **Fix:** Updated to `FinClear <notifications@finclear.app>`
- **Files modified:** DEPLOY.md
- **Committed in:** `1f12ea0` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (missing correctness — wrong domain placeholder)
**Impact on plan:** Minor fix bundled into Task 1 commit. No scope creep.

## Issues Encountered
None.

## User Setup Required

**Task 2 is a human-action checkpoint.** The following external services require manual dashboard configuration before proceeding:

**Stripe:**
- Create 3 subscription products: Starter ($19/mo), Professional ($49/mo), Business ($99/mo)
- Register webhook endpoint: `https://finclear.app/api/webhooks/stripe` for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Enable Customer Portal (Stripe Dashboard -> Settings -> Customer portal)
- Copy all price IDs and webhook signing secret

**Clerk:**
- Register webhook endpoint: `https://finclear.app/api/webhooks/clerk` for `organizationMembership.created`
- Copy signing secret

**Resend:**
- Add and verify sending domain `finclear.app` (add SPF + DKIM DNS records)

**Plaid:**
- Apply for Production access if not already approved
- Copy `client_id` and production secret once approved

**Vercel:**
- Set all 29 production environment variables (see DEPLOY.md for full list)
- Key variables: `DIRECT_URL`, `DATABASE_URL`, all `STRIPE_*_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `CLERK_WEBHOOK_SECRET`, `PLAID_CLIENT_ID`, `PLAID_SECRET`, `ENCRYPTION_KEY` (from `openssl rand -hex 32`), `NEXT_PUBLIC_APP_URL=https://finclear.app`

Type "configured" when complete to resume.

## Next Phase Readiness
- `prisma.config.ts` fix is deployed and committed — migrations will work once `DIRECT_URL` is set in the environment
- `DEPLOY.md` is accurate and can be followed as a deployment guide
- All external service configuration is pending user action (Task 2 checkpoint)

---
*Phase: 01-production-configuration*
*Completed: 2026-03-12*

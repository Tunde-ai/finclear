---
phase: 01-production-configuration
plan: 01
subsystem: infra
tags: [prisma, supabase, pgbouncer, migrations, stripe, clerk, resend, plaid, vercel]

# Dependency graph
requires: []
provides:
  - "prisma.config.ts using DIRECT_URL for migration-safe database connection"
  - "DEPLOY.md with correct DIRECT_URL references in env vars and migration commands"
  - "Stripe: 3 subscription products (Starter $19, Professional $49, Business $99), webhook, Customer Portal"
  - "Clerk: webhook for organizationMembership.created registered in production"
  - "Resend: API key set, domain verification in progress"
  - "Plaid: sandbox credentials configured, production access pending"
  - "Vercel: all production environment variables set"
affects: [02-production-deployment, database-migrations, stripe-billing, clerk-auth, plaid-integration]

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
  - "Plaid configured with sandbox credentials — must update PLAID_SECRET and PLAID_ENV=production when production access is granted"
  - "Resend domain verification in progress — transactional email unavailable until SPF/DKIM DNS records confirmed"
  - "Google Drive integration deferred to a later phase"

patterns-established:
  - "Separation of migration connection (DIRECT_URL) vs runtime connection (DATABASE_URL) is mandatory for Supabase + PgBouncer setups"

# Metrics
duration: 45min
completed: 2026-03-12
---

# Phase 01 Plan 01: Production Configuration Summary

**prisma.config.ts fixed to use DIRECT_URL for DDL-safe migrations, DEPLOY.md corrected, and all external production services configured in Stripe, Clerk, Resend, Plaid, and Vercel**

## Performance

- **Duration:** ~45 min (split across two sessions with human-action checkpoint)
- **Started:** 2026-03-12T13:53:57Z
- **Completed:** 2026-03-12
- **Tasks:** 2/2 complete
- **Files modified:** 2

## Accomplishments
- Fixed `prisma.config.ts` datasource to use `DIRECT_URL` instead of `DATABASE_URL` — without this, `prisma migrate deploy` would fail against production Supabase because PgBouncer in transaction mode rejects DDL
- Updated `DEPLOY.md` to list `DIRECT_URL` alongside `DATABASE_URL` in the Database env vars section, updated migration and seed commands, and added explanatory note about PgBouncer DDL limitation
- Corrected `RESEND_FROM_EMAIL` placeholder to use `finclear.app` domain
- All external production services configured: Stripe (3 products + webhook + Customer Portal), Clerk (webhook), Resend (API key + domain pending verification), Plaid (sandbox credentials set), all env vars set in Vercel

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix prisma.config.ts and update DEPLOY.md migration references** - `1f12ea0` (fix)
2. **Task 2: Configure all external production services** - CHECKPOINT RESOLVED (human-action, no code commit)

**Plan metadata:** `ebd6408` (docs: paused at checkpoint — plan now complete)

## Files Created/Modified
- `prisma.config.ts` - Datasource URL changed from `DATABASE_URL` to `DIRECT_URL`
- `DEPLOY.md` - Added `DIRECT_URL` to env vars, updated migration/seed commands, added PgBouncer note, corrected RESEND_FROM_EMAIL domain

## Decisions Made
- Changed only `prisma.config.ts` datasource (the Prisma CLI config) — `lib/prisma.ts` (runtime client) correctly uses `DATABASE_URL` and was NOT changed
- This separation (DIRECT_URL for migrations, DATABASE_URL for runtime) is the standard Supabase + PgBouncer pattern
- Plaid set to sandbox while awaiting production access approval — must update env vars when access is granted
- Google Drive integration deferred to a later phase by user decision

## Deviations from Plan

**1. [Rule 2 - Auto-fix] Corrected RESEND_FROM_EMAIL placeholder**
- **Found during:** Task 1 (DEPLOY.md review)
- **Issue:** `RESEND_FROM_EMAIL` still had placeholder `notifications@yourdomain.com` instead of the correct `finclear.app` domain
- **Fix:** Updated to `FinClear <notifications@finclear.app>`
- **Files modified:** DEPLOY.md
- **Committed in:** `1f12ea0` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (missing correctness — wrong domain placeholder)
**Impact on plan:** Minor fix bundled into Task 1 commit. No scope creep.

## Issues Encountered
- Resend domain verification was in progress at checkpoint resolution. DNS propagation can take time — no action needed until verification completes in Resend Dashboard.
- Plaid production access not yet approved at time of configuration. Sandbox credentials are functional for testing. Transition to production requires updating `PLAID_SECRET` and `PLAID_ENV=production` when Plaid grants access.

## User Setup Completed

All external services configured by user at Task 2 checkpoint:

| Service | Status | Follow-up Required |
| ------- | ------ | ------------------ |
| Stripe | Complete — 3 products, webhook, Customer Portal | None |
| Clerk | Complete — webhook for organizationMembership.created | None |
| Resend | In progress — API key set, domain verification pending | Confirm DNS verification in Resend Dashboard |
| Plaid | Sandbox set — production access pending | Update PLAID_SECRET + PLAID_ENV=production when approved |
| Vercel env vars | Complete — all production vars set | None |

## Next Phase Readiness
- `prisma.config.ts` fix committed — `prisma migrate deploy` will succeed against Supabase production
- `DEPLOY.md` is accurate and can be used as the deployment guide
- All Vercel production environment variables are set
- Ready to run database migrations and deploy to Vercel
- **Soft blocker:** Resend domain must be verified before transactional email works in production
- **Soft blocker:** Plaid production access must be approved before live bank connections work

---
*Phase: 01-production-configuration*
*Completed: 2026-03-12*

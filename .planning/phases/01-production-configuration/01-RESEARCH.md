# Phase 1: Production Configuration - Research

**Researched:** 2026-03-12
**Domain:** Multi-service SaaS production configuration (Stripe, Clerk, Resend, Vercel, Prisma/Supabase)
**Confidence:** HIGH

## Summary

FinClear is a feature-complete Next.js 14 SaaS with all code already written and all webhook handlers implemented. Phase 1 is purely a configuration phase — no code changes are needed for the core tasks, with one critical exception noted below. The app is already deployed to Vercel; this phase configures the live service accounts to point at the production deployment.

Each service requires its own dashboard steps: Stripe needs 3 products created and a webhook registered, Clerk needs a webhook endpoint for `organizationMembership.created`, Resend needs a sending domain verified with SPF + DKIM DNS records, Vercel needs all production env vars set, and the production Supabase database needs migrations applied via `prisma migrate deploy`.

**Critical gap discovered:** `prisma.config.ts` currently points at `DATABASE_URL` (the Supabase pooler connection) for the Prisma CLI datasource. Migrations MUST use `DIRECT_URL` (a non-pooled connection) because PgBouncer in transaction mode does not support migration operations. This must be fixed before running migrations or the deploy step will fail.

**Primary recommendation:** Follow DEPLOY.md as the base checklist, but fix `prisma.config.ts` to use `DIRECT_URL` first, and add the 7 missing env vars (`STRIPE_*_PRICE_ID` x3, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `DIRECT_URL` with real value, and `NEXT_PUBLIC_APP_URL` production value) before deploying.

## Standard Stack

All libraries are already installed. This phase is configuration-only.

### Core (Already Installed)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| stripe | ^20.4.0 | Stripe Node SDK | Uses apiVersion `2026-02-25.clover` |
| @clerk/nextjs | ^6.39.0 | Clerk auth + webhooks | Uses svix for webhook verification |
| resend | ^6.9.3 | Transactional email | Configured in `lib/resend.ts` |
| prisma | ^7.4.2 | ORM + migrations | Uses `prisma.config.ts` (not schema.prisma) for datasource |
| @prisma/adapter-pg | ^7.4.2 | PrismaPg runtime adapter | Pooled connection at runtime |
| svix | ^1.86.0 | Clerk webhook signature verification | Already used in webhook handler |

### No New Installations Required

All packages are in `package.json`. No `npm install` needed.

## Architecture Patterns

### How the Code Is Already Wired

The project is completely implemented. Understanding the wiring prevents misconfiguration:

**Stripe webhook handler** — `app/api/webhooks/stripe/route.ts`
- Reads `STRIPE_WEBHOOK_SECRET` to verify signatures
- Reads `STRIPE_STARTER_PRICE_ID`, `STRIPE_PROFESSIONAL_PRICE_ID`, `STRIPE_BUSINESS_PRICE_ID` to map price → plan
- Handles: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

**Clerk webhook handler** — `app/api/webhooks/clerk/route.ts`
- Reads `CLERK_WEBHOOK_SECRET` to verify signatures via svix
- Handles: `organizationMembership.created` → assigns ACCOUNTANT role in DB

**Resend** — `lib/resend.ts`
- Reads `RESEND_API_KEY` and `RESEND_FROM_EMAIL`
- `FROM` defaults to `"FinClear <notifications@finclear.app>"` if env var missing (but emails won't send without `RESEND_API_KEY`)

**Prisma runtime** — `lib/prisma.ts`
- Uses `PrismaPg` adapter with `DATABASE_URL` (pooled connection) — CORRECT for runtime
- `prisma.config.ts` exposes the CLI datasource — currently using `DATABASE_URL` (WRONG for migrations)

**Stripe plans** — `lib/plans.ts`
- `PLANS.STARTER.stripePriceId = process.env.STRIPE_STARTER_PRICE_ID || ""`
- If price IDs are empty string, checkout sessions will fail with "Invalid price" error

### Prisma Configuration Architecture (Prisma 7 + Supabase)

```
Runtime (lib/prisma.ts):
  PrismaPg({ connectionString: DATABASE_URL })  ← pooled, via Supavisor, correct

Migrations (prisma.config.ts):
  datasource.url = DIRECT_URL  ← must be non-pooled direct connection
  (currently set to DATABASE_URL — this is the bug to fix)
```

**Current state of `prisma.config.ts`:**
```typescript
datasource: {
  url: process.env["DATABASE_URL"]!,  // BUG: should be DIRECT_URL
}
```

**Corrected `prisma.config.ts`:**
```typescript
datasource: {
  url: process.env["DIRECT_URL"]!,  // must be the direct (non-pooled) connection
}
```

### Vercel Build Command

`vercel.json` already specifies: `"buildCommand": "npx prisma generate && next build"`

This means every Vercel deployment regenerates the Prisma client. No changes needed here.

### Complete Env Var Inventory for Production

All vars that must be set in Vercel dashboard (Production environment):

| Var | Source | Notes |
|-----|--------|-------|
| `DATABASE_URL` | Supabase dashboard > Database > Connection String > Transaction (pooler) | Used by PrismaPg at runtime |
| `DIRECT_URL` | Supabase dashboard > Database > Connection String > Direct | Used by `prisma migrate deploy` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard > API Keys | Must be `pk_live_...` |
| `CLERK_SECRET_KEY` | Clerk dashboard > API Keys | Must be `sk_live_...` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Hardcoded: `/sign-in` | |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Hardcoded: `/sign-up` | |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Hardcoded: `/dashboard/client` | Per DEPLOY.md |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Hardcoded: `/onboarding` | |
| `CLERK_WEBHOOK_SECRET` | Clerk dashboard > Webhooks > endpoint > Signing Secret | After creating endpoint |
| `PLAID_CLIENT_ID` | Plaid dashboard > API Keys | |
| `PLAID_SECRET` | Plaid dashboard > API Keys (Production secret) | Different from sandbox secret |
| `PLAID_ENV` | Hardcoded: `production` | |
| `STRIPE_SECRET_KEY` | Stripe dashboard > API Keys | Must be `sk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe dashboard > API Keys | Must be `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard > Webhooks > endpoint > Signing Secret | After creating endpoint |
| `STRIPE_STARTER_PRICE_ID` | Stripe dashboard > Products > Starter > Price ID | After creating product |
| `STRIPE_PROFESSIONAL_PRICE_ID` | Stripe dashboard > Products > Professional > Price ID | After creating product |
| `STRIPE_BUSINESS_PRICE_ID` | Stripe dashboard > Products > Business > Price ID | After creating product |
| `ANTHROPIC_API_KEY` | Anthropic console | |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard > Project Settings > API | |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard > Project Settings > API | |
| `RESEND_API_KEY` | Resend dashboard > API Keys | After domain verified |
| `RESEND_FROM_EMAIL` | `FinClear <notifications@finclear.app>` | Must match verified domain |
| `GOOGLE_CLIENT_ID` | Google Cloud Console | For Google Drive sync |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | |
| `GOOGLE_REDIRECT_URI` | `https://finclear.app/api/google-drive/callback` | Production URL |
| `ENCRYPTION_KEY` | Generate: `openssl rand -hex 32` | 64-char hex, do not reuse dev value |
| `NEXT_PUBLIC_APP_URL` | `https://finclear.app` | Production domain |

**Currently missing from `.env.local` template (not yet filled in):**
- `STRIPE_STARTER_PRICE_ID`, `STRIPE_PROFESSIONAL_PRICE_ID`, `STRIPE_BUSINESS_PRICE_ID`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `DIRECT_URL` real value (placeholder only)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Webhook signature verification | Custom HMAC verification | `stripe.webhooks.constructEvent()` | Handles timing attacks, encoding edge cases |
| Clerk webhook verification | Custom header parsing | `svix` Webhook class (already in code) | Svix is Clerk's official delivery provider |
| DB connection pooling | Custom pooling | Supabase Supavisor via `DATABASE_URL` | Serverless functions exhaust connections without pooling |
| Migration execution | Manual SQL | `prisma migrate deploy` | Tracks applied migrations, handles ordering |
| Stripe customer portal | Custom subscription management UI | Stripe Customer Portal (already in `app/api/stripe/portal/`) | Handles plan changes, cancellations, invoices |

**Key insight:** Every service in this phase has an official SDK or managed solution already wired. The task is configuration, not code.

## Common Pitfalls

### Pitfall 1: Using Pooled DATABASE_URL for Prisma Migrations
**What goes wrong:** `npx prisma migrate deploy` fails or hangs silently against Supabase's pooled connection
**Why it happens:** PgBouncer in transaction mode doesn't support the session-level operations Prisma migrate uses
**How to avoid:** Fix `prisma.config.ts` to use `DIRECT_URL` before running migrations. The direct URL format is `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
**Warning signs:** Migration command exits without applying migrations, or error containing "prepared statement" or "pgbouncer"

### Pitfall 2: Empty Stripe Price IDs Breaking Checkout
**What goes wrong:** Checkout session creation fails — `stripe.checkout.sessions.create` receives an empty string price
**Why it happens:** `lib/plans.ts` defaults to `""` if env var missing. The checkout route checks `if (!planConfig.stripePriceId)` but an empty string is falsy — the check will catch it, returning a 500 error
**How to avoid:** Set all three `STRIPE_*_PRICE_ID` vars before any user attempts checkout. Create Stripe products first, then set env vars, then deploy.
**Warning signs:** Checkout button returns 400 "Price not configured" error

### Pitfall 3: Stripe Webhook Secret Mismatch
**What goes wrong:** All Stripe webhook events return 400 "Invalid signature"
**Why it happens:** `STRIPE_WEBHOOK_SECRET` in Vercel doesn't match the signing secret of the registered webhook endpoint in Stripe dashboard
**How to avoid:** Copy the signing secret (`whsec_...`) from the specific endpoint after creating it. Each endpoint has a unique secret.
**Warning signs:** Webhook events show as "Failed" in Stripe dashboard with 400 responses

### Pitfall 4: Clerk Webhook Secret Variable Name
**What goes wrong:** Clerk webhook verification fails in production
**Why it happens:** The existing code reads `process.env.CLERK_WEBHOOK_SECRET`. Clerk's own documentation sometimes uses `CLERK_WEBHOOK_SIGNING_SECRET` as the env var name — a mismatch would silently break webhook handling.
**How to avoid:** The existing code at `app/api/webhooks/clerk/route.ts` line 8 uses `CLERK_WEBHOOK_SECRET` — set the Vercel env var to exactly that name.
**Warning signs:** Org membership events don't trigger ACCOUNTANT role assignment

### Pitfall 5: Plaid Production Requires Separate API Keys
**What goes wrong:** Plaid calls fail in production with authentication errors
**Why it happens:** Sandbox and production have different `PLAID_SECRET` values (same `PLAID_CLIENT_ID` can be used across environments, but secrets are environment-specific)
**How to avoid:** Get production secret from Plaid Dashboard > API Keys, set `PLAID_ENV=production`
**Warning signs:** "Invalid credentials" or 401 errors on Plaid API calls

### Pitfall 6: Resend Sending Domain Not Verified Before Setting Env Vars
**What goes wrong:** Emails silently fail to send (code checks `if (!process.env.RESEND_API_KEY) return` — it won't throw, just skip)
**Why it happens:** Resend requires domain verification (SPF + DKIM) before emails can be sent from that domain
**How to avoid:** Verify domain first at resend.com, then set `RESEND_FROM_EMAIL` to use the verified domain
**Warning signs:** No error in logs (the function returns early), but users don't receive notification emails

### Pitfall 7: Redeploying Without Triggering New Env Var Pickup
**What goes wrong:** Env vars set in Vercel dashboard don't apply to existing deployment
**Why it happens:** Per Vercel docs: "Any change you make to environment variables are not applied to previous deployments, they only apply to new deployments"
**How to avoid:** After setting all env vars, trigger a new production deployment (`vercel --prod` or push to main)
**Warning signs:** Correct values in Vercel dashboard but app still using old values

### Pitfall 8: ENCRYPTION_KEY Using Dev Placeholder
**What goes wrong:** Encrypted data from dev (using `0000...` key) cannot be decrypted in production
**Why it happens:** `.env.local` has `ENCRYPTION_KEY=0000...` as placeholder
**How to avoid:** Generate a real key: `openssl rand -hex 32`. Never reuse dev key in production.
**Warning signs:** Decryption errors for any data that was encrypted with the dev key

## Code Examples

Verified patterns from the existing codebase:

### Stripe Webhook Handler (already implemented)
```typescript
// Source: app/api/webhooks/stripe/route.ts
// The PRICE_TO_PLAN map uses env vars loaded at module init time
const PRICE_TO_PLAN: Record<string, SubscriptionPlan> = {
  [process.env.STRIPE_STARTER_PRICE_ID || ""]: "STARTER",
  [process.env.STRIPE_PROFESSIONAL_PRICE_ID || ""]: "PROFESSIONAL",
  [process.env.STRIPE_BUSINESS_PRICE_ID || ""]: "BUSINESS",
};
// Note: empty string key ("") maps to nothing harmful, but checkout will fail
// before reaching here if price IDs aren't set.
```

### Prisma Config Fix Required
```typescript
// Source: prisma.config.ts — CURRENT (broken for migrations):
datasource: {
  url: process.env["DATABASE_URL"]!,  // pooler — wrong for CLI
}

// CORRECT (fix before running migrations):
datasource: {
  url: process.env["DIRECT_URL"]!,  // direct connection — required for migrate deploy
}
```

### Running Migrations Against Production
```bash
# Source: Prisma official docs — prisma migrate deploy
# Set DIRECT_URL env var first, then:
npx prisma migrate deploy

# Or with inline env override:
DIRECT_URL="postgresql://postgres:[PASS]@db.[REF].supabase.co:5432/postgres" npx prisma migrate deploy
```

### Stripe Product Creation Steps (Dashboard)
```
1. Stripe Dashboard > Product catalog > + Add product
2. Name: "Starter" | Pricing: Flat-rate, Recurring, Monthly | Amount: $19.00 USD
3. Save → copy Price ID (format: price_xxxxxx)
4. Repeat for Professional ($49) and Business ($99)
5. Each Price ID goes to respective STRIPE_*_PRICE_ID env var
```

### Webhook Endpoints to Register

**Stripe:**
```
URL:    https://finclear.app/api/webhooks/stripe
Events: checkout.session.completed
        customer.subscription.updated
        customer.subscription.deleted
```

**Clerk:**
```
URL:    https://finclear.app/api/webhooks/clerk
Events: organizationMembership.created
```

## State of the Art

| Old Approach | Current Approach | Impact for This Phase |
|--------------|------------------|-----------------------|
| `url` in `schema.prisma` datasource | `prisma.config.ts` datasource (Prisma 7+) | Must fix `prisma.config.ts` to use `DIRECT_URL` for migrations |
| Separate `directUrl` field in schema | Runtime adapter uses pooled `DATABASE_URL`, CLI config uses `DIRECT_URL` | Two separate env vars required |
| Stripe `apiVersion` as date string | Stripe SDK `2026-02-25.clover` versioning | Already correct in `lib/stripe.ts` |

**Deprecated/outdated:**
- `directUrl` in `schema.prisma`: In Prisma 7, datasource moved to `prisma.config.ts`. The schema has no `url` field at all. This is correctly handled already — the issue is which env var `prisma.config.ts` points to.

## Open Questions

1. **Is `finclear.app` the actual production domain?**
   - What we know: DEPLOY.md and `lib/resend.ts` hardcode `finclear.app`
   - What's unclear: Whether this domain is registered and pointed at Vercel
   - Recommendation: Verify domain is configured in Vercel before setting `NEXT_PUBLIC_APP_URL`. If domain differs, update `RESEND_FROM_EMAIL` and `GOOGLE_REDIRECT_URI` accordingly.

2. **Does Plaid production access require approval?**
   - What we know: Plaid production requires a separate secret key and Plaid reviews new production access requests
   - What's unclear: Whether the account already has production access approved
   - Recommendation: Check Plaid Dashboard for production access status before planning this task. If not approved, production bank linking will not work and may block testing.

3. **Does the Supabase project already have `DIRECT_URL` credentials?**
   - What we know: `.env.local` has `DIRECT_URL` as a placeholder with `[PASSWORD]` and `[PROJECT-REF]`
   - What's unclear: Whether these have been filled in for the existing Supabase project
   - Recommendation: Get direct connection string from Supabase Dashboard > Project Settings > Database > Connection String > Direct. This is needed for migrations.

4. **Has `ENCRYPTION_KEY` been set to a real value anywhere?**
   - What we know: `.env.local` shows `0000...` placeholder
   - What's unclear: Whether a real key was used during development and needs to be preserved
   - Recommendation: If no encrypted data exists in production DB yet, generate a fresh key. If data was encrypted with the placeholder, the placeholder becomes the production key.

## Sources

### Primary (HIGH confidence)
- Project source code (`lib/stripe.ts`, `lib/prisma.ts`, `lib/plans.ts`, `lib/resend.ts`, `lib/plaid.ts`) — exact env var names and usage
- `prisma.config.ts` — confirmed datasource URL bug
- `app/api/webhooks/stripe/route.ts`, `app/api/webhooks/clerk/route.ts` — exact events handled
- `vercel.json` — confirmed build command
- `DEPLOY.md` — existing deployment checklist (cross-referenced and extended)
- [Prisma Supabase docs](https://www.prisma.io/docs/v6/orm/overview/databases/supabase) — DIRECT_URL requirement confirmed
- [Vercel environment variables docs](https://vercel.com/docs/environment-variables) — env scope behavior confirmed

### Secondary (MEDIUM confidence)
- [Stripe billing webhooks docs](https://docs.stripe.com/billing/subscriptions/webhooks) — recommended subscription events
- [Stripe product catalog docs](https://docs.stripe.com/products-prices/manage-prices) — product creation steps
- [Resend domain verification docs](https://resend.com/docs/dashboard/domains/introduction) — SPF + DKIM requirement, verification flow
- [Clerk webhooks docs](https://clerk.com/docs/webhooks/sync-data) — signing secret location, env var name

### Tertiary (LOW confidence)
- WebSearch: Plaid production access approval requirement — flagged as needing validation in Plaid dashboard

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all from project source code, exact versions from package.json
- Architecture: HIGH — directly read from source files, no assumptions
- Pitfalls: HIGH for prisma.config.ts bug (verified from source + Prisma official docs); MEDIUM for Plaid approval (single source)
- Env var inventory: HIGH — exhaustively catalogued from all source files

**Research date:** 2026-03-12
**Valid until:** 2026-06-12 (stable configuration domain; Stripe/Clerk API versions may change)

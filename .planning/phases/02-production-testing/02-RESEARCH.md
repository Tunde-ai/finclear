# Phase 2: Production Testing - Research

**Researched:** 2026-03-13
**Domain:** End-to-end feature verification on live production SaaS (Next.js 14 + Clerk + Plaid + Stripe + Supabase + Anthropic)
**Confidence:** HIGH

---

## Summary

Phase 2 is a manual verification phase, not a code-writing phase. The application is feature-complete — all 31 API endpoints are implemented and the production deployment at https://finclear.app is live. The work is to execute each feature flow on the live URL, confirm it works end-to-end, and document the results. No new code is expected unless a bug is discovered during testing.

The key testing challenge is sequencing. Many features have hard dependencies: Plaid bank connection must succeed before AI reports can generate (reports require transactions), and a Stripe subscription must complete before billing portal can be accessed. Two known soft blockers from Phase 1 constrain what can be fully tested: Resend domain verification may still be pending (email features untestable), and Plaid is on sandbox credentials (real bank connections will fail — use Plaid's sandbox test accounts instead).

The collaboration features (notes, messages, flags) require two user accounts in the same organization — accountant-invites-client flow. The Jamaica House module is a standalone dashboard with its own data model (MarketSale, AdSpend, OperatingCost) that must be seeded manually or via the UI before any meaningful testing.

**Primary recommendation:** Test in dependency order — auth/onboarding first, then Plaid sandbox bank connection, then AI report generation, then PDF/share, then Stripe checkout, then collaboration (requires two accounts). Document each flow result with pass/fail/blocked status. Treat Resend and Plaid production as known blockers — test what's testable in sandbox.

---

## Known Soft Blockers (Carried from Phase 1)

These are **not bugs to fix** — they are external service lifecycle items. Testing tasks must account for them:

| Blocker | Impact | Workaround for Testing |
|---------|--------|------------------------|
| Resend domain verification pending | Transactional email (welcome, notifications) cannot be sent | Verify emails are attempted by checking Resend Dashboard logs; confirm code runs without error even if delivery fails |
| Plaid sandbox credentials | Real bank OAuth will fail; production credentials not yet issued | Use Plaid sandbox test accounts (see Code Examples below) |

---

## Feature Map

All features to test come directly from the application codebase. This is the authoritative list:

### Auth Flow
| Endpoint/Route | What It Does | Test Action |
|----------------|--------------|-------------|
| `/sign-up` + `/sign-in` | Clerk-hosted auth UI | Sign up new user, sign in returning user |
| `/api/auth/set-role` (POST) | Sets CLIENT or ACCOUNTANT role on Clerk publicMetadata + Prisma | Complete onboarding role selection |
| `/onboarding` | Role selection page | New user sees this after signup; existing role → redirect |
| `middleware.ts` | Role-based redirect logic | Verify CLIENT → `/dashboard/client`, ACCOUNTANT → `/dashboard/accountant` |

### Plaid Bank Connection + Transaction Sync
| Endpoint | What It Does | Dependencies |
|----------|--------------|--------------|
| `/api/plaid/create-link-token` (POST) | Creates Plaid Link token | Auth required |
| `/api/plaid/exchange-token` (POST) | Exchanges public token, upserts accounts + 90 days of transactions | Requires valid Plaid link token |
| `/api/plaid/balances` (GET) | Fetches current balances | Requires connected account |
| `/api/plaid/transactions` (GET) | Lists synced transactions | Requires connected account |

### AI Report Generation + PDF Export
| Endpoint | What It Does | Dependencies |
|----------|--------------|--------------|
| `/api/reports/generate` (POST) | Streams SSE response from Anthropic claude-sonnet-4-20250514, saves report | Requires transactions in DB |
| `/api/reports` (GET) | Lists user's reports | Auth required |
| `/api/reports/[id]` (GET) | Fetches single report | Auth + ownership |
| `/api/reports/[id]/pdf` (GET) | Renders PDF via @react-pdf/renderer | Report must be COMPLETED |
| `/api/reports/[id]/share` (POST) | Creates `SharedReportLink` with 30-day expiry token | Report must be COMPLETED |
| `/shared-report/[token]` | Public read-only report page (no auth) | Valid token required |

**Report types supported:** `MONTHLY_PL`, `TAX_DEDUCTIONS`, `CASH_FLOW_FORECAST`, `BUSINESS_HEALTH_SCORE`

### Document Upload + Supabase Storage
| Endpoint | What It Does | Notes |
|----------|--------------|-------|
| `/api/documents/upload` (POST) | Uploads to Supabase Storage bucket, auto-parses PDFs for transactions | Max 25MB; allowed: PDF, JPG, PNG, XLSX, CSV |
| `/api/documents/[id]` (GET/DELETE) | Fetch or delete document record | |

**Supabase Storage bucket:** `documents` (or configured name in `lib/supabase.ts`). Bucket must be created in Supabase Dashboard before uploads will work.

**Google Drive sync is DEFERRED** — do not test, do not block on.

### Stripe Checkout + Subscription Management
| Endpoint | What It Does | Dependencies |
|----------|--------------|--------------|
| `/api/stripe/checkout` (POST) | Creates Stripe Checkout session for STARTER/PROFESSIONAL/BUSINESS plans | Price IDs must be set in Vercel env |
| `/api/stripe/portal` (POST) | Creates Stripe Billing Portal session | Requires existing `stripeCustomerId` in DB |
| `/api/webhooks/stripe` (POST) | Handles checkout.session.completed, subscription.updated/deleted | Stripe webhook must be registered |

**Plan pricing:** STARTER $19, PROFESSIONAL $49, BUSINESS $99. FREE tier exists (no checkout).

### Collaboration Features
| Endpoint | What It Does | Dependencies |
|----------|--------------|--------------|
| `/api/collaboration/notes` (GET/POST) | Transaction notes with threaded replies | Requires `transactionId`; two users for full test |
| `/api/collaboration/messages` (GET/POST) | Organization-scoped messages | Requires organization + membership |
| `/api/collaboration/flags` (POST) | Flag transactions as NEEDS_REVIEW or APPROVED | Requires `transactionId` |
| `/api/collaboration/notifications` | Notification delivery | Resend dependency — may be blocked |

**Critical dependency:** Collaboration features require an organization. The ACCOUNTANT role triggers the Clerk webhook which creates org membership. This requires the Clerk webhook to be registered and firing correctly.

### Jamaica House Module
| Endpoint | What It Does |
|----------|--------------|
| `/api/jamaica-house/sales` (GET/POST) | MarketSale records |
| `/api/jamaica-house/ads` (GET/POST) | AdSpend records |
| `/api/jamaica-house/costs` (GET/POST) | OperatingCost records |
| `/dashboard/jamaica-house` | Client-side dashboard page |

Jamaica House is a standalone module with its own Prisma models. No dependency on Plaid/Stripe. Data must be entered via UI or direct POST to test the dashboard.

### Public Shared Report Links
- `/shared-report/[token]` — No auth required, public page
- Token is 32 random bytes (hex), expiry 30 days from creation
- Returns 404 if token invalid or report not COMPLETED
- Returns "Link Expired" UI if `expiresAt < new Date()`

---

## Architecture Patterns

### Feature Dependency Graph (Test Sequencing)

```
1. Auth (signup → onboarding → role assignment) — INDEPENDENT
   ↓
2. Plaid sandbox bank connection — REQUIRES: auth + Plaid env vars
   ↓
3. Transaction sync (automatic at token exchange) — REQUIRES: Plaid connected
   ↓
4. AI report generation — REQUIRES: transactions in DB
   ↓
5. PDF export + public share link — REQUIRES: COMPLETED report

   (Parallel after #2)
6. Document upload — REQUIRES: Supabase storage bucket exists
7. Stripe checkout — REQUIRES: price IDs in env + Stripe webhook registered
8. Billing portal — REQUIRES: completed Stripe checkout (stripeCustomerId in DB)
9. Collaboration — REQUIRES: two accounts, organization, Clerk webhook
10. Jamaica House — INDEPENDENT (own data model)
```

### Plaid Sandbox Test Accounts (HIGH confidence — Plaid official docs)

Since production Plaid access is pending, use Plaid's sandbox test credentials:

```
Institution: "First Platypus Bank" (sandbox institution ID: ins_109508)
Username: user_good
Password: pass_good

After Link completes, sandbox will return synthetic transactions.
Use these when the Plaid Link modal opens during testing.
```

Source: https://plaid.com/docs/sandbox/test-credentials/

### SSE Streaming Verification

The AI report generation endpoint returns `text/event-stream`. When testing manually:
- The UI should show streaming text appearing incrementally
- The report record in DB starts as `PENDING`, updates to `COMPLETED` when stream ends
- If Anthropic API key is invalid, the stream sends `{ error: "..." }` and report is marked `FAILED`

### Clerk Session Metadata Cache

After `set-role` succeeds, `user.reload()` is called client-side (confirmed in `onboarding/page.tsx` line 61). Without this reload, the Clerk session still holds the old publicMetadata (no role), and the middleware redirects to `/onboarding` again. This is handled in the code — verifying it works end-to-end is the test.

### Supabase Storage Bucket Prerequisite

`lib/supabase.ts` expects a storage bucket named (check `STORAGE_BUCKET` constant in that file). If the bucket doesn't exist in Supabase Dashboard, all document uploads will return `Upload failed: bucket not found`. This must be verified before document upload tests.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Already Done |
|---------|-------------|-------------|--------------|
| Plaid sandbox test flow | Custom mock bank | Plaid sandbox credentials + "First Platypus Bank" | Use sandbox creds |
| PDF generation | Custom HTML-to-PDF | @react-pdf/renderer (already in `/api/reports/[id]/pdf`) | Already implemented |
| Shared link token generation | Custom URL shortener | `randomBytes(32).toString('hex')` + Prisma `SharedReportLink` | Already implemented |
| Stripe test checkout | Real payment | Stripe test card: `4242 4242 4242 4242` | Standard Stripe testing |
| Webhook testing locally | Custom tunnel | Stripe CLI `stripe listen --forward-to localhost:3000` | Only needed if testing locally |

---

## Common Pitfalls

### Pitfall 1: Testing AI Reports Before Transactions Exist
**What goes wrong:** `/api/reports/generate` returns 400 "No transactions found for the selected period"
**Why it happens:** The endpoint explicitly checks `if (transactions.length === 0)` and rejects
**How to avoid:** Always connect Plaid (sandbox) and sync transactions BEFORE attempting report generation
**Warning signs:** 400 error with the specific "No transactions found" message

### Pitfall 2: Supabase Storage Bucket Not Created
**What goes wrong:** Document upload returns 500 with `Upload failed: bucket not found` (or similar Supabase error)
**Why it happens:** The Supabase storage bucket must be created manually in the Supabase Dashboard — it is not auto-created by Prisma migrations
**How to avoid:** Before testing document upload, verify the bucket exists in Supabase Dashboard > Storage
**Warning signs:** `uploadError.message` contains "bucket" or "not found"

### Pitfall 3: Collaboration Tests Require Organization
**What goes wrong:** Messages API returns `{ messages: [], organizationId: null }` — no data, no errors
**Why it happens:** Messages are scoped to organizations. Without org membership, the orgIds array is empty and the query returns nothing
**How to avoid:** Test collaboration only after setting up an ACCOUNTANT user whose Clerk webhook has fired and created an organization + membership in Prisma
**Warning signs:** Empty messages response with no error; check `organizationMember` table in Supabase directly

### Pitfall 4: Stripe Billing Portal Requires Prior Checkout
**What goes wrong:** `/api/stripe/portal` returns 400 "No active subscription"
**Why it happens:** Portal requires `stripeCustomerId` in the `subscription` table, which only gets populated after `checkout.session.completed` webhook fires
**How to avoid:** Complete a Stripe checkout with a test card first, verify webhook fires in Stripe dashboard, then test portal
**Warning signs:** 400 "No active subscription" error

### Pitfall 5: Shared Report Link Returns 404 When Report Not COMPLETED
**What goes wrong:** `/shared-report/[token]` returns Next.js 404 page
**Why it happens:** The page server component calls `notFound()` if `link.report.status !== "COMPLETED"`. Reports start as `PENDING` during generation.
**How to avoid:** Generate the report, wait for streaming to complete fully, THEN create the share link
**Warning signs:** Immediate 404 on a freshly created share link

### Pitfall 6: Session Claims Not Refreshed After Role Assignment
**What goes wrong:** After completing onboarding, user is redirected back to `/onboarding` in a loop
**Why it happens:** Clerk session token caches `sessionClaims.metadata.role`. If `user.reload()` fails or the client doesn't refetch, the old token (no role) is still used by middleware
**How to avoid:** The code calls `user.reload()` before `router.push()` — verify this works end-to-end. If looping occurs, hard-refresh the page.
**Warning signs:** Redirect loop between `/onboarding` and `/dashboard`

### Pitfall 7: Jamaica House Dashboard Shows Empty State
**What goes wrong:** Jamaica House dashboard renders but shows no data
**Why it happens:** MarketSale, AdSpend, and OperatingCost records don't exist until created via the UI or API
**How to avoid:** Use the dashboard UI or POST directly to the three Jamaica House API endpoints to create seed data before verifying the dashboard
**Warning signs:** Empty charts/tables with no error — this is expected behavior for a new user

### Pitfall 8: Plaid Sandbox Returns Outdated transactionsGet Format
**What goes wrong:** Transaction sync silently imports 0 transactions despite "success" response
**Why it happens:** Plaid's sandbox `transactionsGet` uses the older transactions API format. `personal_finance_category` field may be null in some sandbox responses, causing `mapPlaidCategory` to receive empty strings
**How to avoid:** After token exchange, verify the accounts table and transactions table in Supabase directly. If transactions = 0 despite "success", check if `personal_finance_category` is null in sandbox responses.
**Warning signs:** `/api/plaid/exchange-token` returns 200 with account data but transactions table has 0 rows

---

## Code Examples

Verified from codebase source files:

### Auth: set-role endpoint signature
```typescript
// Source: app/api/auth/set-role/route.ts
// POST /api/auth/set-role
// Body: { role: "CLIENT" | "ACCOUNTANT" }
// Returns: { success: true, role: "CLIENT" | "ACCOUNTANT" }
// Side effects: sets Clerk publicMetadata + upserts Prisma user record
```

### Plaid: sandbox test flow
```
// Source: https://plaid.com/docs/sandbox/test-credentials/
// When Plaid Link modal opens in sandbox:
Username: user_good
Password: pass_good
// Institution: "First Platypus Bank" (type in search)
// Completes with synthetic accounts + 90 days of transactions
```

### Reports: SSE streaming verification
```typescript
// Source: app/api/reports/generate/route.ts
// Events emitted:
// 1. { reportId: "..." }          — immediately on stream open
// 2. { text: "..." }              — one per Anthropic text_delta
// 3. { done: true }               — when generation completes
// 4. { error: "..." }             — only on failure

// Test: open browser DevTools > Network > EventStream tab
// Verify events 1, 2 (multiple), 3 appear in sequence
```

### Documents: allowed types + size limit
```typescript
// Source: app/api/documents/upload/route.ts + lib/supabase.ts
// Allowed: PDF, JPG, PNG, XLSX, CSV
// Max size: 25MB (MAX_FILE_SIZE in lib/supabase.ts)
// Storage path format: {userId}/{timestamp}-{sanitized-filename}
```

### Stripe: test card for checkout
```
// Stripe sandbox test card (standard for all Stripe test environments):
Card number: 4242 4242 4242 4242
Expiry: any future date (e.g., 12/28)
CVC: any 3 digits (e.g., 123)
ZIP: any 5 digits (e.g., 12345)
```

### Shared report: token format + expiry
```typescript
// Source: app/api/reports/[id]/share/route.ts
// Token: randomBytes(32).toString("hex") — 64 hex characters
// Expiry: 30 days from creation
// Public URL: https://finclear.app/shared-report/{token}
// No auth required to view
// Returns 404 if: token invalid, report not COMPLETED
// Returns "Link Expired" UI if: expiresAt < now
```

---

## Test Execution Checklist

Ordered by dependency. Each item is a discrete test that produces pass/fail/blocked.

### Block 1: Auth + Onboarding (no external dependencies)
- [ ] Sign up new user at https://finclear.app/sign-up
- [ ] Verify redirect to /onboarding (no role yet)
- [ ] Select CLIENT role → confirm redirect to /dashboard/client
- [ ] Sign up second user, select ACCOUNTANT role → confirm redirect to /dashboard/accountant
- [ ] Sign in as CLIENT user at /sign-in → confirm redirect to /dashboard/client (not /onboarding)
- [ ] Verify middleware cross-role protection: CLIENT accessing /dashboard/accountant → redirected to /dashboard/client

### Block 2: Plaid + Transactions (requires Plaid sandbox env vars)
- [ ] As CLIENT: navigate to Accounts/Transactions section
- [ ] Initiate Plaid Link connection
- [ ] Use sandbox credentials (user_good / pass_good / First Platypus Bank)
- [ ] Verify accounts appear in dashboard
- [ ] Verify transactions populated in Transactions view
- [ ] Check Supabase: `account` table has rows, `transaction` table has rows, `category` table has rows

### Block 3: AI Reports + PDF + Share (requires transactions from Block 2)
- [ ] Generate MONTHLY_PL report
- [ ] Verify streaming text appears in real-time (EventStream in DevTools)
- [ ] Verify report reaches COMPLETED status
- [ ] Download PDF — verify file opens and contains report content
- [ ] Create share link — verify URL format https://finclear.app/shared-report/{token}
- [ ] Open share link in incognito/private window (no auth) — verify report renders
- [ ] Generate remaining report types: TAX_DEDUCTIONS, CASH_FLOW_FORECAST, BUSINESS_HEALTH_SCORE

### Block 4: Document Upload (requires Supabase storage bucket)
- [ ] Verify storage bucket exists in Supabase Dashboard
- [ ] Upload a PDF document
- [ ] Verify document record appears in Documents view
- [ ] Verify Supabase Storage shows the uploaded file
- [ ] Upload a JPG/PNG — verify accepted
- [ ] Attempt upload > 25MB — verify rejected with appropriate error
- [ ] For PDF: verify parsedStatus transitions PARSING → PARSED (or FAILED if no transactions detected)

### Block 5: Stripe Checkout + Subscription (requires Stripe products + webhook)
- [ ] Navigate to /pricing as signed-in CLIENT
- [ ] Click Subscribe on STARTER plan
- [ ] Complete Stripe test checkout with card 4242 4242 4242 4242
- [ ] Verify redirect to /dashboard/client?upgraded=true
- [ ] Verify Stripe Dashboard shows completed checkout session
- [ ] Verify Stripe webhook fires and /api/webhooks/stripe receives the event
- [ ] Verify subscription record created in Prisma (check Supabase `subscription` table)
- [ ] Access billing portal: confirm portal UI loads with subscription management
- [ ] Test plan change or cancellation in portal

### Block 6: Collaboration (requires two accounts + organization)
- [ ] As ACCOUNTANT: invite CLIENT user to organization (or verify org exists from Clerk webhook)
- [ ] As CLIENT: verify org membership in /api/collaboration/messages
- [ ] As ACCOUNTANT: add note to a transaction — verify note appears
- [ ] As CLIENT: reply to note — verify threaded reply
- [ ] As ACCOUNTANT: flag a transaction as NEEDS_REVIEW — verify flag status
- [ ] As either: send a message — verify appears for both users
- [ ] Verify notifications endpoint responds (may be blocked by Resend)

### Block 7: Jamaica House Module (independent)
- [ ] Navigate to /dashboard/jamaica-house
- [ ] Enter sales data via UI (or POST to /api/jamaica-house/sales)
- [ ] Enter ad spend data
- [ ] Enter operating costs
- [ ] Verify dashboard renders data/charts correctly

### Block 8: Public Shared Reports (requires completed report from Block 3)
- [ ] Verify share link from Block 3 works in unauthenticated browser session
- [ ] Verify expired link shows "Link Expired" UI
- [ ] Verify invalid token returns 404

### Block 9: Resend Email (verify attempt, not delivery)
- [ ] Trigger an action that sends email (signup, invitation)
- [ ] Check Resend Dashboard > Logs for attempted sends
- [ ] If domain verified: confirm email delivered to inbox
- [ ] If domain not yet verified: confirm no uncaught error in app, log shows attempt

---

## State of the Art

| Area | Relevant Current State |
|------|----------------------|
| Plaid sandbox | `user_good` / `pass_good` credentials still valid as of 2026 (HIGH confidence — official docs) |
| Stripe test cards | `4242 4242 4242 4242` is the standard test card (unchanged) |
| Clerk session reload | `user.reload()` required after metadata update — this is the documented Clerk pattern |
| Anthropic model | Code uses `claude-sonnet-4-20250514` — this is a current valid model ID |
| @react-pdf/renderer | v4.3.2 in package.json — `renderToBuffer` is the correct API |

---

## Open Questions

1. **Is the Supabase Storage bucket already created?**
   - What we know: The upload code references `STORAGE_BUCKET` from `lib/supabase.ts` — bucket name is defined there
   - What's unclear: Whether the bucket was created in Supabase Dashboard as part of Phase 1
   - Recommendation: Check `lib/supabase.ts` for `STORAGE_BUCKET` value, then verify in Supabase Dashboard > Storage before testing document upload

2. **Has Resend domain verification completed?**
   - What we know: Phase 1 VERIFICATION.md shows this as a gap — "domain verification in progress"
   - What's unclear: Whether DNS propagation has completed since 2026-03-13
   - Recommendation: First action in Phase 2 should be checking Resend Dashboard for verified status; this determines whether email features are testable

3. **Does the Clerk webhook fire correctly in production, creating org membership?**
   - What we know: The webhook handler is implemented and wired; Clerk webhook registration was a human verification item in Phase 1
   - What's unclear: Whether the Clerk webhook was actually registered and tested end-to-end
   - Recommendation: The Block 6 collaboration test inherently verifies this — if collaboration features work, the Clerk webhook is firing

4. **Are Plaid sandbox credentials currently set in Vercel (vs. production)?**
   - What we know: Phase 1 VERIFICATION.md documents that sandbox credentials were configured with production env still listing `PLAID_ENV=production`
   - What's unclear: The actual values currently in Vercel — if `PLAID_ENV=production` with sandbox keys, Plaid calls will fail
   - Recommendation: Before Plaid tests, verify Vercel env has either `PLAID_ENV=sandbox` with sandbox keys, or await Plaid production access approval. If sandbox testing needed, temporarily set `PLAID_ENV=sandbox` in Vercel.

---

## Sources

### Primary (HIGH confidence)
- Project codebase (read directly): `app/api/auth/set-role/route.ts`, `app/api/plaid/create-link-token/route.ts`, `app/api/plaid/exchange-token/route.ts`, `app/api/reports/generate/route.ts`, `app/api/reports/[id]/pdf/route.ts`, `app/api/reports/[id]/share/route.ts`, `app/api/stripe/checkout/route.ts`, `app/api/stripe/portal/route.ts`, `app/api/collaboration/notes/route.ts`, `app/api/collaboration/messages/route.ts`, `app/api/documents/upload/route.ts`, `app/shared-report/[token]/page.tsx`, `middleware.ts`, `app/onboarding/page.tsx`
- `.planning/phases/01-production-configuration/01-RESEARCH.md` — Phase 1 decisions and pitfalls
- `.planning/phases/01-production-configuration/01-VERIFICATION.md` — Known soft blockers carried forward

### Secondary (MEDIUM confidence)
- https://plaid.com/docs/sandbox/test-credentials/ — Sandbox test credentials (user_good/pass_good)
- https://stripe.com/docs/testing — Stripe test card 4242 4242 4242 4242

### Tertiary (LOW confidence)
- None — all findings grounded in direct codebase reading

---

## Metadata

**Confidence breakdown:**
- Feature map: HIGH — directly read from source files; no assumptions
- Test sequencing: HIGH — dependency graph derived from code (reports check for transactions, portal checks for stripeCustomerId, etc.)
- Soft blockers: HIGH — documented in Phase 1 VERIFICATION.md with explicit evidence
- Plaid sandbox credentials: MEDIUM — official Plaid docs, but sandbox behavior can change
- Pitfalls: HIGH — derived from actual guard clauses and error handling in the code

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable domain; Plaid sandbox credentials are long-lived)

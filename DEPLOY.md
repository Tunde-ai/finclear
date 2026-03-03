# FinClear — Production Deployment Checklist

## Prerequisites

- [x] Node.js 18+ installed
- [x] Vercel CLI installed (`npm i -g vercel`)
- [x] All dependencies installed (`npm install`)
- [x] Prisma client generated (`npx prisma generate`)
- [x] Build compiles successfully (TypeScript + ESLint clean)

---

## 1. Environment Variables for Vercel Dashboard

Add all of these in **Vercel > Project Settings > Environment Variables**:

### Database
```
DATABASE_URL=postgresql://user:pass@host:5432/finclear?sslmode=require
```

### Clerk Authentication
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard/client
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
CLERK_WEBHOOK_SECRET=whsec_...
```

### Plaid (Bank Connections)
```
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENV=production
```

### Stripe (Billing)
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PROFESSIONAL_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Supabase (File Storage)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Anthropic AI
```
ANTHROPIC_API_KEY=sk-ant-...
```

### Resend (Email Notifications)
```
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=FinClear <notifications@yourdomain.com>
```

### Google Drive (Optional)
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://finclear.app/api/google-drive/callback
```

### App URL
```
NEXT_PUBLIC_APP_URL=https://finclear.app
```

### Encryption
```
ENCRYPTION_KEY=<64-character hex string>
```

---

## 2. Database Setup

### Run migrations against production database:
```bash
DATABASE_URL="your-production-url" npx prisma migrate deploy
```

### (Optional) Seed demo data:
```bash
DATABASE_URL="your-production-url" npx tsx prisma/seed.ts
```

---

## 3. Stripe Setup

1. Create 3 products in Stripe Dashboard:
   - **Starter** — $19/month recurring
   - **Professional** — $49/month recurring
   - **Business** — $99/month recurring

2. Copy each product's Price ID to the env vars above

3. Set up Stripe webhook endpoint:
   - URL: `https://finclear.app/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

4. Configure Customer Portal in Stripe Dashboard

---

## 4. Clerk Setup

1. Set up webhook endpoint:
   - URL: `https://finclear.app/api/webhooks/clerk`
   - Events: `organizationMembership.created`

2. Configure redirect URLs in Clerk Dashboard

---

## 5. Resend Setup

1. Verify your sending domain at resend.com
2. Set the `RESEND_FROM_EMAIL` to use your verified domain

---

## 6. Deploy to Vercel

```bash
# Link project (first time only)
npx vercel link

# Deploy to production
npx vercel --prod
```

The build command is configured in `vercel.json`:
```
npx prisma generate && next build
```

---

## 7. Post-Deploy Verification

1. Visit the live URL
2. `/landing` — Marketing page loads with dark gold theme
3. `/pricing` — Three pricing tiers display correctly
4. `/sign-up` — Clerk sign-up flow works
5. `/dashboard/client` — Dashboard loads after onboarding
6. `/dashboard/client/reports` — Reports page accessible
7. `/dashboard/jamaica-house` — JHB module loads
8. `/dashboard/client/messages` — Messages inbox works
9. Generate a report — AI streaming works end-to-end
10. Download PDF — PDF renders and downloads
11. Share report link — Public URL loads without login

---

## Architecture Overview

```
/app
  /landing          — Marketing page (dark gold theme)
  /pricing          — Stripe Checkout pricing page
  /shared-report    — Public read-only report viewer
  /dashboard
    /client         — Client dashboard (bank sync, budgets, etc.)
    /accountant     — Accountant dashboard
    /jamaica-house  — Jamaica House Brand module
  /api
    /reports        — AI report generation (SSE streaming)
    /jamaica-house  — Market sales, COGS, ad spend
    /collaboration  — Notes, messages, flags
    /stripe         — Checkout + portal
    /plaid          — Bank connections
    /documents      — File management
    /webhooks       — Stripe + Clerk webhooks
```

---

## Key Features

- **AI Reports**: Monthly P&L, Tax Deductions, Cash Flow Forecast, Business Health Score
- **Jamaica House Module**: Market day sales, product performance, COGS, vendor fees, ad ROI
- **Collaboration**: Threaded transaction notes, shared inbox, approval flags
- **Email Notifications**: Via Resend (notes, documents, reports, tax deadlines)
- **Shareable Reports**: Public read-only links (no login required)
- **Stripe Billing**: 3 tiers (Starter $19, Professional $49, Business $99)
- **PDF Export**: Styled FinClear-branded PDF reports
- **Bank Sync**: Plaid integration with 12,000+ institutions
- **Document Management**: Upload + Google Drive sync

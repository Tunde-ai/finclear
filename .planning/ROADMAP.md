# FinClear - Roadmap

## Milestone: v1.0 Launch

### Phase 1: Production Configuration ⬜
**Goal:** Configure all services for production deployment
**Plans:** 2 plans

Plans:
- [ ] 01-01-PLAN.md -- Fix Prisma config bug + configure all external services (Stripe, Clerk, Resend, Vercel env vars)
- [ ] 01-02-PLAN.md -- Run production migrations + deploy and verify

- Stripe: Create 3 products, configure webhook endpoint
- Clerk: Configure webhook for org membership events
- Resend: Verify sending domain
- Set all env vars in Vercel dashboard
- Run Prisma migrations against production DB
- **Requirements:** REQ-01

### Phase 2: Production Testing ⬜
**Goal:** Verify all features work end-to-end on live URL
- Auth flow (signup, login, role assignment, onboarding)
- Plaid bank connection and transaction sync
- AI report generation and PDF export
- Document upload and Google Drive sync
- Stripe checkout and subscription management
- Collaboration features (notes, messages, flags)
- Jamaica House module
- Public shared report links
- **Requirements:** REQ-02

### Phase 3: Performance & Polish ⬜
**Goal:** Optimize for production load
- Lighthouse audit and fixes
- Image optimization
- API response caching
- Error monitoring (Sentry or similar)
- **Requirements:** REQ-03

### Phase 4: Client Onboarding ⬜
**Goal:** Streamline new user experience
- Welcome email sequence (Resend)
- Guided tour for first-time users
- Sample data for demo/trial accounts
- Help documentation
- **Requirements:** REQ-04

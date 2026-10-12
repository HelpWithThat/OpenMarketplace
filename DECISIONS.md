# Architecture Decisions

## Tech Stack

### Next.js 15 + Simple Auth (Latest Decision)
**Decision Date**: Oct 11, 2026

After attempting Next.js 16 + Auth.js v5 beta, we switched to a simpler, more stable stack:
- **Next.js 15.x** (latest stable, not 16 beta/RC)
- **React 18** (stable with Next 15)
- **iron-session 8** for secure, httpOnly session cookies
- **bcrypt** for password hashing
- **Custom auth**: Single `getCurrentUser()` helper used everywhere
- **Middleware**: Protects all app routes, redirects to /login if not authenticated

**Why**: Auth.js v5 beta had incomplete types, Next.js 16 had async params breaking changes and static rendering conflicts with auth pages. The simple approach is:
- Fully typed
- Easy to debug
- No external dependencies that can break
- Works perfectly with Next.js 15's stable APIs

**Auth Flow**:
1. User submits login/signup form
2. API route validates credentials, creates session via iron-session
3. Session stored as signed, httpOnly cookie
4. `getCurrentUser()` reads session, fetches full user from DB
5. Middleware blocks unauthenticated requests to protected routes

### Database & ORM
- Prisma 7.10.0 with `@prisma/adapter-pg` 
- PostgreSQL via Prisma Dev (local development)
- Connection string format: `prisma+postgres://` with base64-encoded actual postgres URL
- **Seed script**: Now idempotent - uses upserts and deletes/recreates jobs safely

### Fee Calculation
- 20% platform fee on labor (configurable)
- Fee split: 80/20 buyer/worker by default (also supports 70/30)
- Zero fee on reimbursable expenses
- Implemented in `lib/fees.ts` with comprehensive unit tests

### Money privacy (buyer vs worker)
**Owner rule (2026-10-12):** each side sees only its own money. This is enforced in the API, not just hidden in the UI.

- **Workers never see** what the buyer pays: no buyer fee share, no buyer total (`buyerFee`, `buyerPays`, `buyerTotal`, `youPay`).
- **Buyers never see** what the worker receives: no worker fee share, no worker payout (`workerFee`, `workerGets`, `workerPayout`, `youGet`).
- Combined platform totals (`platformFee`, `platformKeeps`) are also omitted from role-facing payloads because they leak the other side once you know your own fee.
- Buyer view: labor price + their fee + their total (`youPay`).
- Worker view: labor price + their fee + what they get (`youGet`).
- Posted / counter-offered amounts are **labor** only. Each side's fee is applied on their own receipt.
- Implementation: `lib/fee-privacy.ts` (`feesForJob`, `omitCrossSideMoney`). Job GET/list and approve responses attach a role-filtered `fees` object and strip forbidden keys. Regression test: `__tests__/fee-privacy-api.test.ts`.

### Payment Architecture
- Pluggable provider interface (`lib/payments/types.ts`)
- Mock provider for development (`MockPaymentProvider`)
- Stripe Connect integration stubbed (ready for API keys)
- All payment flows tested with mock provider

### File Storage
- Pluggable storage interface (`lib/storage/types.ts`)
- Local filesystem provider for dev (`LocalStorageProvider` -> `uploads/`, served by `/api/uploads` so `next start` can return files written after boot; `public/` is snapshotted at startup)
- Supabase Storage provider ready (`SupabaseStorageProvider`)

## Component Library

- shadcn/ui for all UI primitives (Button, Input, Card, etc.)
- Tailwind CSS 4 for styling
- Lucide React for icons
- No custom button/input components - always use shadcn

## Testing Strategy

- Fee calculator: Unit tests with exact product plan scenarios
- Integration tests: Core flows (8 tests covering job lifecycle)
- E2E: Playwright with mobile viewport (390x844)
- Test accounts: buyer@demo.com / worker@demo.com (password: password123)

## Deployment Considerations

### Current State (MVP)
- Works in dev mode (`npm run dev`)
- Seed script idempotent
- All features implemented
- File uploads ready (local storage)
- Auth working with session cookies

### Production Readiness
- Build: Next 15 stable, should build cleanly
- Files: Local storage works for dev; swap to S3/Supabase for production
- Payments: Mock provider; needs Stripe Connect API keys
- Email: No email service (SendGrid/Postmark needed)
- Real-time: Messaging needs WebSocket/Pusher
- Sessions: iron-session is production-ready

## What's Not Included

- Email verification and notifications
- SMS/phone verification
- Push notifications
- Real-time messaging updates
- Background job queue (for auto-approve)
- Error tracking (Sentry)
- Analytics
- Terms of service / legal pages

## Why These Choices

**Next.js 15 over 16**: Version 15 is latest stable. Version 16 had async params API breakage and static rendering issues with auth. Stability > bleeding edge for MVP.

**Simple Auth over Auth.js v5**: Auth.js v5 beta had incomplete types and mysterious callback issues. Custom iron-session + bcrypt is:
- 100% under our control
- Fully typed
- Easy to debug
- Production-proven (iron-session used by many)

**Prisma 7**: Required for latest features. Adapter setup complex but works great once configured.

**Local Storage**: Perfect for dev. Production should use S3 or Supabase Storage (provider already implemented).

**Mock Payments**: Lets us test entire flow without Stripe API keys. Real Stripe Connect integration is straightforward when ready.

## Authentication Decision Details

### What We Tried First
1. **Auth.js (next-auth) v5.0.0-beta.32**
   - Issue: Beta quality, incomplete types
   - Issue: `getServerSession` removed, new `auth()` API unclear
   - Issue: Callback routes not working in Playwright tests
   - Issue: Poor Next.js 16 compatibility

### What We Chose
**iron-session + bcrypt + custom helpers**
- Session stored in signed, httpOnly cookie
- `getCurrentUser()` helper provides user + profiles everywhere
- Middleware protects routes
- No magic, full control

### Implementation
```typescript
// lib/auth.ts exports:
- getCurrentUser(): Promise<User | null>
- login(email, password): Promise<Result>
- logout(): Promise<void>
- signup(data): Promise<Result>
- getSession(): Promise<IronSession<SessionData>>

// API routes:
POST /api/auth/login
POST /api/auth/logout  
POST /api/auth/signup
GET  /api/auth/me

// Middleware protects all /(app) routes
```

All server components and API routes call `getCurrentUser()` consistently.

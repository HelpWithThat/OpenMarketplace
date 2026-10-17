# HelpWithThat

A mobile-first PWA marketplace where anyone can post jobs and anyone qualified can work on them. Built for Joe Thomas. People need help with things — HelpWithThat is the market name.

## What It Is

Get help with tasks and jobs: mount a TV, count inventory, design a logo, move furniture, or anything else. Buyers post jobs with custom task checklists, workers browse and request jobs, and money is held safely until work is approved.

## Key Features

- **Open to any work**: Not limited to one trade. Use category tags for organization.
- **Simple fees**: 20% platform fee on labor (split 80/20 between buyer/worker by default), no fee on expenses
- **Flexible task builder**: Create custom checklists with photos, signatures, check-ins, and more
- **Two-way ratings**: Workers rate buyers and buyers rate workers
- **Privacy by default**: Only show general location; exact address revealed to assigned worker only
- **PWA (Progressive Web App)**: Installable, works offline, feels like a native app

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Payments**: Pluggable provider interface (Mock provider + Stripe Connect ready)
- **Deployment**: Render-ready (render.yaml included)

## Local Setup

1. **Clone and install**:
   ```bash
   git clone <repo-url>
   cd open-marketplace
   npm install
   ```

2. **Set up database**:
   ```bash
   # Start local Prisma Postgres in a separate terminal
   ./scripts/dev-db.sh
   # OR: npx prisma dev
   
   # In another terminal, reset migrations and seed
   npx prisma migrate reset --force
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

5. **Open in browser**:
   Navigate to http://localhost:43891

## Demo Accounts

If you seeded the database, you can log in with these accounts (password: `password123`):

**Buyer:**
- buyer@demo.com (Sarah Johnson - Johnson Home Services)

**Worker:**
- worker@demo.com (Alex Rivera - Handyman)

## Environment Variables

See `.env.example` for all available options. Key settings:

- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Random secret for session encryption
- `FEE_RATE`: Platform fee rate (default: 0.20 = 20%)
- `FEE_SPLIT_BUYER` / `FEE_SPLIT_WORKER`: How fee is split (default: 80/20)
- `STRIPE_SECRET_KEY`: (Optional) Enable Stripe Connect for real payments

## Fee Calculator

The fee calculator is fully tested and implements the exact spec from the product plan:

```bash
npm run test:fees
```

Examples:
- $200 labor + $30 expenses with 80/20 split: buyer pays $262, worker gets $222
- $200 labor + $30 expenses with 70/30 split: buyer pays $258, worker gets $218

## Production Deployment

### Render

1. Create a new Web Service on Render
2. Connect your repository
3. Render will auto-detect `render.yaml` and create:
   - Web service (Next.js app)
   - PostgreSQL database
4. Set environment variables in Render dashboard:
   - `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
   - `STRIPE_SECRET_KEY` (if using Stripe)
5. Deploy!

### Supabase (Optional)

You can swap to hosted Supabase for the database:

1. Create a Supabase project
2. Update `DATABASE_URL` to your Supabase connection string
3. Run migrations: `npx prisma db push`

## What's Included

✅ **Core Flows:**
- Sign up / login with email + password
- Worker profiles (photo, bio, skills, location + travel radius)
- Buyer profiles (business name, description)
- Job posting with flexible task builder
- Job browsing with filters
- Request/counter-offer system
- Per-job messaging
- Task completion with check-in/out, photos, expenses
- Approval flow (auto-approve after 3 days)
- Two-way ratings (revealed simultaneously)

✅ **Technical:**
- PWA manifest and configuration
- Fee calculator with unit tests
- Payment provider interface (mock + Stripe Connect stub)
- Responsive mobile-first UI
- Clean, documented codebase

## What's Mocked/Simplified (Beta)

- **Payments**: Uses mock provider by default. Stripe Connect integration is stubbed and ready for API keys.
- **File uploads**: Placeholders for photos, receipts, signatures (ready to wire to storage like S3 or Supabase)
- **SmartMatch**: UI page exists but no background matching logic yet
- **Messaging**: Basic structure in place, needs real-time updates
- **Notifications**: In-app alerts stubbed, push notifications need service worker

## Going Live

To go from this working beta to production-ready:

1. **Payments**: Add Stripe Connect API keys and complete Stripe integration
2. **File storage**: Wire uploads to S3, Cloudinary, or Supabase Storage
3. **Email**: Add email service (SendGrid, Postmark) for notifications and verification
4. **SMS**: Add Twilio for phone verification and important alerts
5. **Real-time**: Add WebSockets or Pusher for live messaging
6. **Background jobs**: Add job queue (BullMQ, Inngest) for auto-approve, notifications
7. **Monitoring**: Add error tracking (Sentry) and analytics
8. **Legal**: Terms of service, privacy policy, contractor agreements

## Architecture Decisions

See [DECISIONS.md](./DECISIONS.md) for detailed rationale behind technical choices.

## License

Proprietary - Built for Joe Thomas

## Support

For questions or issues, contact the development team or open an issue in the repository.

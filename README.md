# WHAATOPRO

**WhatsApp API. Automation. CRM. All in One.**

WHAATOPRO is a production-ready, multi-tenant WhatsApp Business SaaS platform. It provides a complete WhatsApp Commerce and Communication suite — CRM, live inbox, campaign broadcasting, message templates, no-code chatbot builder, automation engine, public API, analytics, billing, and a super-admin panel — built on the official Meta WhatsApp Business Platform Cloud API.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Radix UI, Recharts |
| Backend | Next.js API Routes, Node.js background workers |
| Database | PostgreSQL + Prisma ORM |
| Queue | BullMQ (Redis) with in-process fallback |
| Auth | NextAuth v5 (credentials, JWT sessions) |
| WhatsApp | Official Meta Cloud API (`v18.0`) with pluggable provider abstraction + Mock provider for development |
| Cache/Queue | Redis (ioredis) |

## Features

### Customer Dashboard
- Dashboard with real-time stats (messages sent/delivered/read/failed, contacts, campaigns, usage)
- Charts: messages over time, delivery rate, contact growth

### CRM & Contacts
- Full contact management with custom fields, tags, notes
- CSV import/export with validation (valid/invalid/duplicate rows, error reports)
- Bulk tag/delete/update, search, filters, sorting, pagination

### WhatsApp Inbox
- Three-panel live inbox: conversation list, messages, customer info
- Text, media, template sending; delivery status tracking; agent assignment; tags; notes; close/reopen
- Multi-agent system with manual/round-robin/rule-based routing

### Message Templates
- Create template drafts, submit/verify through Meta, preview with live phone mockup
- Status tracking (approved/pending/rejected/paused/disabled) with rejection reasons

### Campaigns
- Multi-step wizard (audience builder → template → schedule → review)
- Opt-in enforcement, queue-based sending with rate limiting, pause/resume/cancel
- Per-recipient delivery analytics and campaign funnel charts

### Chatbot Builder (no-code)
- Visual node editor: Start, Message, Buttons, Lists, Questions, Conditions, Delay, API Call, Assign Agent, Tags, Webhook, AI Agent, End
- Node palette, canvas, edge connections, publish/unpublish, versioning, flow validation

### Automation Engine
- Triggers: incoming message, contact created, tag added/removed, campaign completed, schedule
- Conditions (AND/OR groups), actions (send message/template, tags, assign, wait, webhook, API call, chatbot)
- Background worker execution, execution history

### Public API (`/api/v1`)
- REST API with Bearer token (API key) auth, scoped permissions
- Messages, contacts, campaigns, templates, analytics endpoints with consistent JSON responses

### Webhooks
- Meta webhook gateway with signature verification, idempotent event processing
- Customer-configurable outgoing webhooks with signing, retry, delivery logs

### Analytics
- Real DB-driven analytics: message volumes, delivery/read/failure rates, contact growth, campaign performance, agent performance, date-range filters

### Billing & Usage
- Plans (Free/Starter/Pro/Business/Enterprise) stored in DB, configurable limits
- Usage metering, progress bars, upgrade prompts, invoices, payment-provider abstraction (Stripe/Razorpay-ready)

### Super Admin Panel (`/admin`)
- Platform overview, customer/workspace management, WhatsApp account diagnostics, plan configuration, subscription management, message monitoring, webhook monitoring, audit logs, support tickets, system settings

### Security
- bcrypt password hashing, AES-256-GCM credential encryption, JWT sessions
- Tenant isolation at every DB/API layer, role-based access control (OWNER/ADMIN/MANAGER/AGENT/VIEWER)
- Rate limiting, input validation (Zod), webhook signature validation, audit logging
- Secrets via environment variables — never exposed to the frontend

## Project Structure

```
src/
  app/
    (auth)/            # Login, register, error pages
    (dashboard)/       # Customer SaaS dashboard (all customer-facing pages)
    (admin)/           # Super-admin panel
    api/               # REST API + public API (v1) + webhooks
  components/
    ui/                # shadcn-style UI primitives (Radix UI + Tailwind)
    layout/            # Sidebar, top-nav, admin sidebar
    contacts/ inbox/ templates/ chatbots/ automation/ billing/ api/   # Feature components
  lib/
    whatsapp/          # Meta provider + Mock provider (pluggable)
    workers/           # Background workers (messages, campaigns)
    queue.ts           # Queue abstraction (in-process fallback for BullMQ)
    auth.ts tenant.ts  # Auth + tenant context + permission checks
    prisma.ts redis.ts encryption.ts errors.ts api-utils.ts validators.ts
  proxy.ts             # Route protection + role gates
prisma/
  schema.prisma        # Full relational schema (35+ models)
  seed.ts              # Demo data seed script
```

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- (Optional) Redis 6+ — falls back to in-process queue when `REDIS_URL` is unset

### 1. Install & configure

```bash
npm install
cp .env.example .env
# edit .env — set DATABASE_URL, NEXTAUTH_SECRET, ENCRYPTION_KEY, WHATSAPP_PROVIDER=mock
```

### 2. Database

```bash
npx prisma migrate dev --name init
npx prisma db seed   # creates admin + demo workspace + demo data
```

### 3. Run

```bash
npm run dev          # http://localhost:3000
```

Demo credentials (seed data):
- Super Admin: `admin@whaatopro.com` / `password123`
- Demo workspace OWNER: `demo@whaatopro.com` / `password123`

### 4. Development mode (no Meta credentials needed)

Set `WHATSAPP_PROVIDER=mock` in `.env`. The Mock provider simulates sends, deliveries and reads so every flow (campaigns, inbox, templates, automation) works end-to-end without Meta. The UI shows a **Development / Mock Mode** indicator so mock messages are never mistaken for real WhatsApp messages.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Lint |
| `npm test` | Unit tests (Vitest) |
| `npx tsc --noEmit` | Type check |
| `npx prisma migrate dev` | Create/apply migrations |
| `npx prisma migrate deploy` | Apply migrations in production |
| `npx prisma db seed` | Seed development data |
| `npx prisma studio` | Browse database |

## Testing & CI

Unit tests (Vitest) cover the core pure logic: utilities, Zod validators, RBAC permissions, and the AES-256-GCM encryption module — `npm test` runs them. GitHub Actions CI (`.github/workflows/ci.yml`) runs **typecheck → lint → test → build** on every push to `main` and on pull requests.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Auth encryption secret (generate with `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Yes | Public app URL |
| `NEXT_PUBLIC_APP_URL` | For Meta | Public app URL used to build the OAuth redirect URI |
| `ENCRYPTION_KEY` | Yes | 32-char key used to encrypt Meta credentials at rest |
| `WHATSAPP_PROVIDER` | No | `meta` (production) or `mock` (development). Default `meta`. |
| `REDIS_URL` | No | Redis connection for BullMQ queues. Falls back to in-process worker. |
| `META_APP_ID` / `META_APP_SECRET` | For Meta | Facebook App credentials |
| `META_ACCESS_TOKEN` | For Meta | System access token used as the default sending credential |
| `META_WEBHOOK_VERIFY_TOKEN` | For Meta | Webhook verification token |
| `META_WEBHOOK_SECRET` | For Meta | Webhook signature secret |
| `CAMPAIGN_RATE_LIMIT_MS` / `CAMPAIGN_BATCH_SIZE` | No | Campaign throughput tuning |
| `PAYMENT_PROVIDER` | No | `stripe` or `razorpay` |
| `STRIPE_SECRET_KEY` / `RAZORPAY_KEY_ID` | For payments | Payment gateway keys |

## Deployment

### Vercel

```bash
npx vercel
```

Configure all env vars from the table above. Use a managed PostgreSQL (Neon, Supabase, Railway) and Redis (Upstash). Run `npx prisma migrate deploy` against the production database.

### Docker

```bash
docker build -t whaatopro .
docker run -p 3000:3000 --env-file .env whaatopro
```

## Meta (WhatsApp Cloud API) Setup

1. Create a Meta app at developers.facebook.com with the WhatsApp product.
2. Configure OAuth redirect URI → `https://<your-domain>/api/whatsapp/callback`.
3. Set `META_APP_ID`, `META_APP_SECRET`, `META_ACCESS_TOKEN`, `META_WEBHOOK_VERIFY_TOKEN` (any random string), `META_WEBHOOK_SECRET`, and `NEXT_PUBLIC_APP_URL`.
4. Set up the webhook subscription URL → `https://<your-domain>/api/webhooks/meta` with the verify token.
5. Subscribed fields: `messages` and `message_template_status_update`.
6. Set `WHATSAPP_PROVIDER=meta`.
7. Customers connect their WhatsApp Business Account from **WhatsApp → Connect** using the official Meta OAuth flow (no passwords involved).

> The onboarding, OAuth, token storage (encrypted), webhook config, template submission, and message sending are all implemented in `src/lib/whatsapp/meta-provider.ts`. Completing the steps above is the only external configuration required — no code changes needed.

## License

All rights reserved. This is a commercial SaaS product codebase.
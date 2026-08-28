# BookFlow

**Multi-business booking & appointment SaaS** — one system, any service business.

BookFlow lets salons, clinics, tutors, spas, and workshops manage staff availability, services, and customer bookings from a single dashboard. Built to scale from a single shop to a multi-tenant platform.

## The Problem

Small service businesses in Thailand still run appointments through phone calls and paper notebooks — leading to double-bookings, missed calls, and no-shows. Existing booking software is either too generic (built for restaurants/events) or too expensive/complex for a single-location shop.

## The Solution

BookFlow provides:
- **Multi-business support** — one codebase, configurable for salons, clinics, tutors, spas, and more via a `business_type` setting
- **Staff & service management** — define who does what, how long it takes, and when they're available
- **Online booking flow** — customers book a time slot without calling
- **Admin dashboard** — owners see today's schedule, manage bookings, and track customers
- **Soft-delete data model** — nothing is permanently lost; records can be restored and audited

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: JWT-based session auth
- **Deployment**: Docker, Railway
- **Testing**: Vitest

## Live Demo

> 🔗 [demo link — add once deployed]
>
> Sample businesses seeded: a hair salon, a dental clinic, and a private tutor — showing how the same system adapts to different service types.

## Project Structure

```
bookflow/
├── app/                 # Next.js App Router pages & API routes
├── db/
│   ├── schema.ts        # Drizzle schema (see schema.ts)
│   └── migrations/      # Drizzle migrations
├── lib/
│   ├── availability/    # Slot calculation logic (framework-agnostic, unit tested)
│   └── auth/            # JWT session handling
├── components/          # UI components
└── tests/                # Vitest test suite
```

## Getting Started

```bash
# 1. Clone and install
git clone https://github.com/chakronwork/bookflow.git
cd bookflow
npm install

# 2. Configure environment
cp .env.example .env
# set DATABASE_URL, JWT_SECRET, etc.

# 3. Run migrations & seed demo data
npm run db:migrate
npm run db:seed

# 4. Start dev server
npm run dev
```

## Roadmap

- [ ] LINE Notify integration for booking reminders
- [ ] Multi-tenant billing (Stripe/Omise) for SaaS launch
- [ ] Customer-facing booking widget (embeddable)
- [ ] Analytics dashboard for business owners

## License

MIT — built by [Chakron](https://github.com/chakronwork)

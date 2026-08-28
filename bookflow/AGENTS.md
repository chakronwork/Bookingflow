# AGENTS.md — BookFlow

Instructions for AI coding agents (Claude Code, etc.) working on this repo.

## Project

**BookFlow** — a multi-business booking/appointment SaaS. One codebase serves
small businesses (salons, spas), clinics, and hospitals through a single,
hybrid, config-driven data model — not separate hardcoded modes.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- PostgreSQL + Drizzle ORM
- JWT-based session auth
- Docker + docker-compose for local dev
- Vitest for testing

## Core Design Principle — read this before writing any business logic

`businesses.type` (salon / clinic / hospital / tutor / spa / workshop /
generic) is a **label only** — used for onboarding UI and analytics.

All actual behavior is driven by `businesses.config` (JSONB): `bookingFlow`,
`requiresDepartment`, `allowWalkIn`, `hasEmergencyQueue`,
`requiresPatientHistory`, `cancellationWindowHours`, etc.

**Never branch application logic on `businesses.type`.** A business can mix
flags freely (e.g. a clinic with an emergency queue, or a salon that wants
patient-history-style notes). Always read `businesses.config`.

## Setup Tasks

1. **Init project**
   - `npx create-next-app@latest` (TypeScript, App Router, Tailwind, ESLint)
   - Configure Drizzle ORM + PostgreSQL (`DATABASE_URL` via `.env.example`)
   - Configure Vitest
   - Add `docker-compose.yml` (Next.js app + PostgreSQL)

2. **Schema**
   - Place the provided `schema.ts` at `db/schema.ts`
   - Generate first migration: `drizzle-kit generate`
   - Write `db/seed.ts` seeding 3 example businesses:
     - Hair salon — `bookingFlow: "direct"`, no departments
     - Dental clinic — `bookingFlow: "service_first"`, with departments
     - Hospital — `bookingFlow: "department_queue"`, with departments +
       emergency queue
   - Each seeded business needs staff, services, and availability slots

3. **Project structure**
   ```
   bookflow/
   ├── app/
   │   ├── (dashboard)/       # Admin/staff dashboard routes
   │   ├── (public)/          # Public booking flow per business slug
   │   └── api/                # API routes
   ├── db/
   │   ├── schema.ts
   │   ├── seed.ts
   │   └── migrations/
   ├── lib/
   │   ├── availability/       # Slot calculation — pure functions, unit tested
   │   ├── booking-flow/       # Resolver reading business.config to pick UI flow
   │   └── auth/                # JWT session handling
   ├── components/
   ├── tests/
   ├── docker-compose.yml
   ├── .env.example
   └── README.md
   ```

4. **README.md**
   - Use the provided `README.md` as a base, update once actual structure
     exists (paths, scripts, screenshots placeholders).

## Hard Requirements

- **Soft delete everywhere**: every query on a core table filters
  `deletedAt IS NULL` by default. Implement one shared query helper (e.g.
  `withSoftDelete()`) rather than repeating the filter ad hoc.
- **No type-based branching**: business logic reads `businesses.config`,
  never `businesses.type`.
- **Test availability logic first**: `lib/availability/` gets unit tests as
  soon as it's written (TDD-friendly, this is the highest-risk logic).
- **Commit in steps**, not one giant commit: init → schema → seed → auth →
  booking flow. Each commit message should say what changed and why.
- **`.env.example`** must include `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`.

## After Scaffolding

Summarize what was built and flag anything that needs a human decision
(e.g. connecting a real PostgreSQL instance, deploy target, payment
provider for future billing).

## Reference Files

- `schema.ts` — full Drizzle schema (normalized, soft-delete, hybrid config model)
- `README.md` — project overview and problem statement

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

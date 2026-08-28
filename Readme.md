# BookFlow

BookFlow is a configurable, multi-business booking and appointment platform for service-based organizations. It supports salons, clinics, hospitals, tutors, spas, workshops, and other businesses through one shared application and data model.

The platform provides public booking pages, availability-aware time slots, staff and service management, authentication, and an operational queue dashboard.

## Core Principles

- **Configuration over hardcoded business types:** `businesses.type` is a label for onboarding and analytics. Booking behavior is driven by the business `config` JSON object, so each organization can combine capabilities independently.
- **Multi-tenant by design:** Businesses, services, staff, schedules, and bookings are isolated by business context.
- **Availability-first booking:** Customers can select a service, staff member, date, and available time slot before confirming a booking.
- **Recoverable data:** Core records use soft deletion so data is not removed permanently by default.

## Features

- Public booking pages at `/<business-slug>`
- Configurable booking flows, including direct, service-first, and department-queue flows
- Service duration and staff availability management
- Availability calculation that excludes unavailable and already-booked periods
- JWT-based dashboard authentication
- Dashboard views for bookings, services, and queue operations
- PostgreSQL persistence with Drizzle ORM
- Seed data for sample businesses and demo accounts

## Technology

- Next.js 16 with the App Router
- React 19 and TypeScript
- Tailwind CSS 4
- PostgreSQL and Drizzle ORM
- JWT sessions with `jose`
- Vitest for unit testing
- Docker Compose for local PostgreSQL

## Requirements

- Node.js 20 or later
- npm
- PostgreSQL 14 or later, or Docker Desktop

## Getting Started

### 1. Install dependencies

```bash
git clone https://github.com/chakronwork/Bookingflow.git
cd Bookingflow
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Update `.env` with values appropriate for your environment:

| Variable | Description | Example |
| --- | --- | --- |
| `NODE_ENV` | Application environment | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres:postgres@localhost:5432/bookflow` |
| `JWT_SECRET` | Secret used to sign sessions | Use a long, random production value |

### 3. Start PostgreSQL

To run the local database with Docker Compose:

```bash
docker compose up -d
```

### 4. Create the database schema and seed data

```bash
npm run db:push
npm run db:seed
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Demo Account

After seeding the database, open `/login` and use:

```text
Email: alex@luxe.local
Password: password123
```

The seed script creates sample businesses, staff, services, and availability records for local development.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest test suite |
| `npm run db:generate` | Generate a Drizzle migration |
| `npm run db:push` | Apply the schema directly to the database |
| `npm run db:seed` | Insert local demo data |

## Project Structure

```text
app/
	(dashboard)/             Authenticated dashboard pages
	(public)/                Public business booking pages
	api/                     Authentication, booking, availability, and dashboard APIs
components/dashboard/     Dashboard UI components
db/                        Drizzle schema, migrations, helpers, and seed data
lib/availability/          Pure availability and slot calculation logic
lib/booking-flow/          Config-driven booking flow resolution
lib/auth/                  JWT session handling
tests/                     Vitest tests
```

## API Surface

- `POST /api/auth/login` - Create a dashboard session
- `POST /api/auth/logout` - End the current session
- `GET /api/businesses/:slug` - Load a public business and its booking flow
- `GET /api/businesses/:slug/availability` - Retrieve available appointment slots
- `POST /api/bookings` - Create a booking
- `GET /api/dashboard/queue` - Load queue data for the dashboard
- `GET /api/dashboard/services` - Load dashboard service data

## Testing

Run the availability tests with:

```bash
npm test -- --run
```

Availability calculation is implemented as framework-independent logic so it can be tested without a running server or database.

## Roadmap

- Booking reminders through LINE or email
- Embeddable booking widget
- Reporting and analytics for business owners
- Billing and subscription management
- Expanded queue and department workflows

## License

This project is licensed under the MIT License. See the repository for details.

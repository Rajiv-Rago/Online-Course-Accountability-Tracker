# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint (next/core-web-vitals)
npm run test         # Vitest unit/integration tests
npm run test:watch   # Vitest in watch mode
npm run test:coverage # Vitest with v8 coverage
npm run test:e2e     # Playwright E2E tests (requires dev server)
npm run test:e2e:ui  # Playwright with interactive UI
```

### Test Stack

- **Vitest** (868 tests, 41 files) — Unit, integration, server action, security, and spec compliance tests. Config: `vitest.config.ts`. Global setup mocks Supabase, OpenAI, and Next.js server utilities.
- **Playwright** (104 tests, 8 files) — E2E browser tests across chromium + mobile. Config: `playwright.config.ts`. Auth tests in `e2e/auth.spec.ts` run without credentials. Authenticated tests require `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` env vars.
- Test infrastructure: `src/test/` (mocks, factories, helpers). E2E helpers: `e2e/helpers/`.

## Architecture

AI-powered course accountability tracker built with **Next.js 14 App Router**, **Supabase** (Postgres + Auth), **OpenAI GPT-4**, deployed on **Vercel**.

### Routing & Layouts

- `src/app/(auth)/` — Public routes (login, signup). Centered card layout.
- `src/app/(app)/` — Protected routes with sidebar + header. Middleware redirects unauthenticated users to `/login`.
- `src/app/api/` — API routes for auth callbacks and cron jobs only.

### Auth Flow

Supabase Auth with JWT. Session validated in middleware (`src/lib/supabase/middleware.ts`). Four Supabase client variants exist for different contexts:
- `client.ts` — Browser (client components)
- `server.ts` — Server components/actions (reads cookies)
- `middleware.ts` — Next.js middleware (session refresh)
- `admin.ts` — Service role for admin operations

### Data Layer

All data access goes through Supabase. Authorization is enforced via Row-Level Security policies filtering by `auth.uid()` — no custom auth logic needed in app code. Mutations should use **server actions** (not API routes). API routes are reserved for cron jobs, webhooks, and external integrations.

Database schema: 10 tables defined in `supabase/migrations/00001_foundation.sql`. JSONB columns store flexible AI outputs.

### State Management

TanStack React Query for server state (60s stale time, refetch on window focus). Wrapped via `QueryProvider` in root layout.

### Feature Blocks

The app is decomposed into 8 independent blocks, each owning specific tables:
- **B1** User Profile — **B2** Course Management — **B3** Progress Tracking — **B4** AI Analysis
- **B5** Dashboard — **B6** Notifications — **B7** Social/Buddy — **B8** Visualization

Block specs live in `docs/blocks/`. Cross-block communication happens through the database only.

### Styling

Tailwind CSS with shadcn/ui components (Radix UI primitives). Dark mode via `next-themes` class strategy. Colors use HSL CSS custom properties defined in `globals.css`. Brand palette: orange (`#f97316`) primary, teal (`#14b8a6`) secondary.

### Cron Jobs (vercel.json)

- `/api/cron/daily-analysis` — 2 AM daily (AI risk scoring)
- `/api/cron/weekly-report` — 3 AM Monday
- `/api/cron/send-reminders` — Every 15 minutes
- `/api/cron/daily-stats` — 11:59 PM daily

### Type System

Shared types in `src/lib/types/`. Enums are `as const` objects with union type extraction (not TypeScript `enum`). Path alias: `@/*` maps to `src/*`.

## Key Documentation

Comprehensive specs in `docs/`: `SPEC.md`, `ARCHITECTURE.md`, `DATABASE.md`, `API_CONTRACTS.md`, `INTEGRATION.md`, `DEPLOYMENT.md`.

## Environment Variables

Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`

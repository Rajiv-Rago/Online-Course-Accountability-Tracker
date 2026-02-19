# System Architecture - Course Accountability Tracker

> AI-powered course accountability tracker that analyzes learning patterns,
> predicts quit risk, and delivers personalized interventions.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Feature-Sliced Block Design](#2-feature-sliced-block-design)
3. [Directory Structure](#3-directory-structure)
4. [Block Dependency Graph](#4-block-dependency-graph)
5. [Table Ownership Matrix](#5-table-ownership-matrix)
6. [Communication Patterns](#6-communication-patterns)
7. [Data Flow Diagrams](#7-data-flow-diagrams)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [AI Pipeline Architecture](#9-ai-pipeline-architecture)
10. [Deployment Architecture](#10-deployment-architecture)

---

## 1. System Overview

### 1.1 High-Level Architecture Diagram

```
+------------------------------------------------------------------+
|                        VERCEL (Edge Network)                      |
|                                                                   |
|  +------------------------------------------------------------+  |
|  |                  Next.js 14+ (App Router)                   |  |
|  |                                                             |  |
|  |  +------------------+  +------------------+  +-----------+  |  |
|  |  |  React Server    |  |  Server Actions  |  | API Routes|  |  |
|  |  |  Components      |  |  (per block)     |  | /api/*    |  |  |
|  |  +--------+---------+  +--------+---------+  +-----+-----+  |  |
|  |           |                     |                   |        |  |
|  |           +---------------------+-------------------+        |  |
|  |                                 |                            |  |
|  |                    +------------+------------+               |  |
|  |                    |  Supabase Client Layer  |               |  |
|  |                    |  (browser/server/admin) |               |  |
|  |                    +------------+------------+               |  |
|  +------------------------------------------------------------+  |
|                                |                                  |
|  +-----------------------------+-------------------------------+  |
|  |                     Vercel Cron Jobs                        |  |
|  |           (AI analysis, notifications, cleanup)             |  |
|  +-------------------------------------------------------------+  |
+------------------------------------------------------------------+
         |                    |                    |
         v                    v                    v
+------------------+  +---------------+  +------------------+
|   Supabase       |  |  Supabase     |  |   OpenAI API     |
|   PostgreSQL     |  |  Auth (JWT)   |  |   (GPT-4)        |
|                  |  |               |  |                   |
|  - 10 tables     |  |  - Email/Pass |  |  - Analysis       |
|  - RLS policies  |  |  - OAuth      |  |  - Risk scoring   |
|  - Realtime      |  |  - JWT tokens |  |  - Interventions  |
|  - Edge Funcs    |  |  - Sessions   |  |  - Recommendations|
+------------------+  +---------------+  +------------------+
```

### 1.2 Technology Stack Rationale

| Technology        | Role                    | Why Chosen                                                                                         |
| ----------------- | ----------------------- | -------------------------------------------------------------------------------------------------- |
| **Next.js 14+**   | Full-stack framework    | App Router enables RSC (React Server Components), server actions, streaming, and parallel routes.   |
| **TypeScript**    | Type safety             | Shared types across blocks enforce interface contracts at compile time.                             |
| **Supabase**      | Backend-as-a-Service    | Postgres + Auth + Realtime + Row Level Security in one managed platform. No custom backend needed.  |
| **PostgreSQL**    | Primary database        | ACID compliance, JSONB for flexible AI outputs, excellent indexing for time-series study data.      |
| **OpenAI GPT-4**  | AI analysis engine      | Best-in-class reasoning for pattern analysis, risk prediction, and personalized interventions.      |
| **Vercel**        | Hosting & deployment    | Native Next.js support, edge network, serverless functions, built-in cron jobs, preview deploys.   |
| **shadcn/ui**     | Component library       | Accessible, composable, copy-paste components built on Radix UI + Tailwind CSS.                    |
| **Tailwind CSS**  | Styling                 | Utility-first CSS with design tokens, fast iteration, consistent design system.                     |

**Key Architectural Decisions:**

- **Server Components by default.** Client components only where interactivity is required (forms, charts, realtime subscriptions). This minimizes client bundle size and keeps sensitive logic server-side.
- **Server Actions over API routes** for mutations. API routes are reserved for cron jobs, webhooks, and external integrations.
- **Supabase RLS as the authorization layer.** Every table has row-level security policies that filter by `auth.uid()`. No application-level access control code is needed.
- **Feature-sliced design** with 8 independent blocks. Each block owns its tables, components, actions, and types. Cross-block communication happens exclusively through the database.

### 1.3 Next.js App Router Structure

The App Router uses file-system-based routing with two route groups:

- `(auth)` -- Public routes for authentication (login, signup, password reset).
- `(app)` -- Protected routes that require a valid session. Middleware redirects unauthenticated users to `/login`.

Each route group has its own layout. The `(app)` layout includes the sidebar, header, and Supabase session provider. The `(auth)` layout uses a minimal centered card layout.

---

## 2. Feature-Sliced Block Design

The system is decomposed into **8 independent feature blocks**. Each block is a self-contained module with clear table ownership, its own components, server actions, and types. Blocks can be developed in parallel by separate developers with no code-level dependencies on each other.

### Block Summary

| Block | Name                | Owns Tables                           | Key Responsibilities                                           |
| ----- | ------------------- | ------------------------------------- | -------------------------------------------------------------- |
| B1    | User Profile        | `user_profiles`                       | Onboarding wizard, preferences, settings, timezone management  |
| B2    | Course Management   | `courses`                             | CRUD courses, status transitions, priority levels, categories  |
| B3    | Progress Tracking   | `study_sessions`, `daily_stats`       | Session logging (start/stop/manual), streaks, daily aggregates |
| B4    | AI Analysis         | `ai_analyses`, `weekly_reports`       | GPT-4 pipeline, risk scoring, interventions, weekly summaries  |
| B5    | Dashboard           | _(none -- reads all)_                 | Main view, course cards, quick stats, recent activity feed     |
| B6    | Notifications       | `notifications`, `reminder_schedules` | Push/email/in-app alerts, smart reminders, scheduling engine   |
| B7    | Social              | `study_buddies`, `achievements`       | Buddy system, achievements/badges, sharing, accountability     |
| B8    | Visualization       | _(none -- reads all)_                 | Charts, heatmaps, trend lines, pattern analysis, exports       |

### Block Details

#### B1 - User Profile

**Owner:** `user_profiles` table
**Purpose:** Manages the user's identity beyond Supabase Auth. Stores onboarding state, display preferences, study goals, timezone, and notification settings.

Key features:
- Onboarding wizard (runs once after first login)
- Study goal configuration (hours per week, target courses)
- Timezone and locale preferences
- Theme and display settings
- Account management (display name, avatar)

**Server Actions:** `createProfile`, `updateProfile`, `completeOnboarding`, `updatePreferences`

---

#### B2 - Course Management

**Owner:** `courses` table
**Purpose:** Full CRUD for courses the user is tracking. Each course has a status lifecycle (`not_started` -> `in_progress` -> `completed` | `dropped`), a priority level, and metadata like platform, URL, and estimated hours.

Key features:
- Add/edit/archive/delete courses
- Status transitions with validation
- Priority levels (high, medium, low)
- Course categories and tags
- Estimated vs. actual hours tracking

**Server Actions:** `createCourse`, `updateCourse`, `deleteCourse`, `updateCourseStatus`, `reorderCoursePriority`

---

#### B3 - Progress Tracking

**Owner:** `study_sessions`, `daily_stats` tables
**Purpose:** Records study activity and computes aggregates. Users can log sessions via a timer (start/stop) or manual entry. Daily stats are computed from sessions and track streaks.

Key features:
- Live study timer with pause/resume
- Manual session entry with duration and notes
- Daily stats aggregation (total time, sessions count, streak)
- Streak calculation and maintenance
- Session history with filtering

**Server Actions:** `startSession`, `endSession`, `logManualSession`, `updateDailyStats`, `getStreakInfo`

---

#### B4 - AI Analysis

**Owner:** `ai_analyses`, `weekly_reports` tables
**Purpose:** The intelligence layer. Runs on a schedule (Vercel cron) and on-demand. Gathers user data, builds prompts, calls GPT-4, parses structured responses, and stores analyses with risk scores and personalized interventions.

Key features:
- Automated weekly analysis via cron
- On-demand analysis trigger
- Risk scoring (0-100) per course
- Personalized intervention recommendations
- Weekly summary reports with trends
- Token usage tracking and optimization

**Server Actions:** `triggerAnalysis`, `getLatestAnalysis`, `getWeeklyReport`, `dismissRecommendation`

---

#### B5 - Dashboard

**Owner:** No tables (read-only aggregator)
**Purpose:** The main landing page after login. Composes data from all other blocks into a unified view. Uses parallel data fetching with React Suspense for fast perceived load times.

Key features:
- Today's study summary (from B3)
- Active course cards with progress (from B2, B3)
- Current streak display (from B3)
- Latest AI insights/risk alerts (from B4)
- Recent notifications preview (from B6)
- Quick-start study session button (triggers B3)
- Achievement highlights (from B7)

**Server Actions:** None (uses read queries only; delegates writes to other blocks' actions)

---

#### B6 - Notifications

**Owner:** `notifications`, `reminder_schedules` tables
**Purpose:** Manages all notification channels and reminder scheduling. Notifications are triggered by other blocks' events (via DB triggers or cron inspection) and delivered through the configured channels.

Key features:
- In-app notification center
- Smart reminder scheduling (study reminders, deadline alerts)
- Notification preferences (channels, quiet hours)
- Risk alert notifications (triggered by B4 analyses)
- Streak-at-risk warnings
- Mark as read / dismiss / snooze

**Server Actions:** `getNotifications`, `markAsRead`, `markAllAsRead`, `createReminder`, `updateReminderSchedule`, `deleteReminder`

---

#### B7 - Social

**Owner:** `study_buddies`, `achievements` tables
**Purpose:** Adds social accountability through a buddy system and gamification through achievements. Users can pair with study buddies to share progress and earn badges for consistent study habits.

Key features:
- Send/accept/decline buddy requests
- Buddy progress visibility (opt-in)
- Achievement definitions and unlock logic
- Badge display on profile
- Progress sharing (generate shareable cards)
- Accountability check-ins

**Server Actions:** `sendBuddyRequest`, `respondToBuddyRequest`, `removeBuddy`, `checkAchievements`, `getAchievements`, `generateShareCard`

---

#### B8 - Visualization

**Owner:** No tables (read-only aggregator)
**Purpose:** Advanced data visualization for study patterns and trends. Reads from multiple tables to generate charts, heatmaps, and statistical analyses. Uses client-side charting libraries (Recharts or similar).

Key features:
- Study time heatmap (GitHub-style contribution graph)
- Course progress over time (line charts)
- Daily/weekly/monthly study breakdowns (bar charts)
- Risk score trends (from B4)
- Session duration distributions
- Comparative analysis across courses
- Export charts as images

**Server Actions:** None (uses read queries only; all rendering is client-side)

---

## 3. Directory Structure

```
course-accountability-tracker/
|
+-- docs/                              # Project documentation
|   +-- ARCHITECTURE.md                # This file
|   +-- SPEC.md                        # Product specification
|   +-- DATABASE.md                    # Schema, RLS, migrations
|   +-- API_CONTRACTS.md               # API route contracts
|   +-- INTEGRATION.md                 # Integration phase guide
|   +-- DEPLOYMENT.md                  # Deployment guide
|   +-- blocks/                        # Per-block developer specs
|       +-- B1-USER-PROFILE.md
|       +-- B2-COURSE-MANAGEMENT.md
|       +-- B3-PROGRESS-TRACKING.md
|       +-- B4-AI-ANALYSIS.md
|       +-- B5-DASHBOARD.md
|       +-- B6-NOTIFICATIONS.md
|       +-- B7-SOCIAL.md
|       +-- B8-VISUALIZATION.md
|
+-- public/                            # Static assets
|   +-- icons/
|   +-- images/
|
+-- src/
|   |
|   +-- app/                           # Next.js App Router
|   |   +-- layout.tsx                 # Root layout (html, body, providers)
|   |   +-- page.tsx                   # Root page (redirects to /dashboard)
|   |   +-- globals.css                # Global styles + Tailwind directives
|   |   |
|   |   +-- (auth)/                    # Public auth route group
|   |   |   +-- layout.tsx             # Centered card layout
|   |   |   +-- login/
|   |   |   |   +-- page.tsx           # Login page
|   |   |   +-- signup/
|   |   |   |   +-- page.tsx           # Signup page
|   |   |   +-- forgot-password/
|   |   |   |   +-- page.tsx           # Password reset request
|   |   |   +-- reset-password/
|   |   |       +-- page.tsx           # Password reset form
|   |   |
|   |   +-- (app)/                     # Protected route group
|   |   |   +-- layout.tsx             # App shell (sidebar + header + main)
|   |   |   |
|   |   |   +-- dashboard/            # B5 - Dashboard
|   |   |   |   +-- page.tsx           # Main dashboard view
|   |   |   |   +-- loading.tsx        # Suspense fallback
|   |   |   |
|   |   |   +-- courses/              # B2 - Course Management
|   |   |   |   +-- page.tsx           # Course list view
|   |   |   |   +-- new/
|   |   |   |   |   +-- page.tsx       # Add new course
|   |   |   |   +-- [courseId]/
|   |   |   |       +-- page.tsx       # Course detail view
|   |   |   |       +-- edit/
|   |   |   |           +-- page.tsx   # Edit course
|   |   |   |
|   |   |   +-- progress/             # B3 - Progress Tracking
|   |   |   |   +-- page.tsx           # Session history & stats
|   |   |   |   +-- log/
|   |   |   |       +-- page.tsx       # Manual session entry
|   |   |   |
|   |   |   +-- analysis/             # B4 - AI Analysis
|   |   |   |   +-- page.tsx           # Latest analysis & reports
|   |   |   |   +-- reports/
|   |   |   |       +-- page.tsx       # Weekly reports archive
|   |   |   |
|   |   |   +-- notifications/        # B6 - Notifications
|   |   |   |   +-- page.tsx           # Notification center
|   |   |   |   +-- settings/
|   |   |   |       +-- page.tsx       # Reminder & notification settings
|   |   |   |
|   |   |   +-- social/               # B7 - Social
|   |   |   |   +-- page.tsx           # Buddies & achievements
|   |   |   |   +-- achievements/
|   |   |   |       +-- page.tsx       # Achievement gallery
|   |   |   |
|   |   |   +-- visualizations/       # B8 - Visualization
|   |   |   |   +-- page.tsx           # Charts & analytics view
|   |   |   |
|   |   |   +-- settings/             # B1 - User Profile
|   |   |       +-- page.tsx           # Profile & preferences
|   |   |       +-- onboarding/
|   |   |           +-- page.tsx       # First-time onboarding wizard
|   |   |
|   |   +-- api/                       # API routes (serverless functions)
|   |   |   +-- auth/
|   |   |   |   +-- callback/
|   |   |   |       +-- route.ts       # Supabase auth callback handler
|   |   |   +-- cron/
|   |   |   |   +-- ai-analysis/
|   |   |   |   |   +-- route.ts       # Cron: trigger AI analysis pipeline
|   |   |   |   +-- daily-stats/
|   |   |   |   |   +-- route.ts       # Cron: aggregate daily stats
|   |   |   |   +-- notifications/
|   |   |   |   |   +-- route.ts       # Cron: process reminder schedules
|   |   |   |   +-- streak-check/
|   |   |   |       +-- route.ts       # Cron: check and update streaks
|   |   |   +-- ai/
|   |   |   |   +-- analyze/
|   |   |   |   |   +-- route.ts       # On-demand AI analysis endpoint
|   |   |   |   +-- weekly-report/
|   |   |   |       +-- route.ts       # Generate weekly report
|   |   |   +-- webhooks/
|   |   |       +-- supabase/
|   |   |           +-- route.ts       # Supabase webhook handler
|   |   |
|   |   +-- auth/
|   |       +-- confirm/
|   |           +-- route.ts           # Email confirmation handler
|   |
|   +-- blocks/                        # Feature-sliced blocks
|   |   |
|   |   +-- b1-user-profile/
|   |   |   +-- components/            # Block-specific React components
|   |   |   |   +-- profile-form.tsx
|   |   |   |   +-- onboarding-wizard.tsx
|   |   |   |   +-- preferences-panel.tsx
|   |   |   +-- actions.ts             # Server actions for this block
|   |   |   +-- queries.ts             # Supabase read queries
|   |   |   +-- types.ts               # Block-specific types
|   |   |   +-- constants.ts           # Block constants (defaults, enums)
|   |   |   +-- utils.ts               # Block utility functions
|   |   |
|   |   +-- b2-course-management/
|   |   |   +-- components/
|   |   |   |   +-- course-form.tsx
|   |   |   |   +-- course-card.tsx
|   |   |   |   +-- course-list.tsx
|   |   |   |   +-- status-badge.tsx
|   |   |   |   +-- priority-selector.tsx
|   |   |   +-- actions.ts
|   |   |   +-- queries.ts
|   |   |   +-- types.ts
|   |   |   +-- constants.ts
|   |   |   +-- utils.ts
|   |   |
|   |   +-- b3-progress-tracking/
|   |   |   +-- components/
|   |   |   |   +-- study-timer.tsx
|   |   |   |   +-- session-log-form.tsx
|   |   |   |   +-- session-history.tsx
|   |   |   |   +-- streak-display.tsx
|   |   |   |   +-- daily-summary.tsx
|   |   |   +-- actions.ts
|   |   |   +-- queries.ts
|   |   |   +-- types.ts
|   |   |   +-- constants.ts
|   |   |   +-- utils.ts
|   |   |
|   |   +-- b4-ai-analysis/
|   |   |   +-- components/
|   |   |   |   +-- analysis-card.tsx
|   |   |   |   +-- risk-score-badge.tsx
|   |   |   |   +-- intervention-list.tsx
|   |   |   |   +-- weekly-report-view.tsx
|   |   |   +-- actions.ts
|   |   |   +-- queries.ts
|   |   |   +-- types.ts
|   |   |   +-- constants.ts
|   |   |   +-- utils.ts
|   |   |   +-- prompts.ts             # GPT-4 prompt templates
|   |   |   +-- parser.ts              # AI response parsing logic
|   |   |
|   |   +-- b5-dashboard/
|   |   |   +-- components/
|   |   |   |   +-- dashboard-grid.tsx
|   |   |   |   +-- today-summary.tsx
|   |   |   |   +-- course-overview-cards.tsx
|   |   |   |   +-- recent-activity.tsx
|   |   |   |   +-- quick-actions.tsx
|   |   |   |   +-- ai-insights-panel.tsx
|   |   |   +-- queries.ts             # Reads from multiple block tables
|   |   |   +-- types.ts
|   |   |   +-- constants.ts
|   |   |
|   |   +-- b6-notifications/
|   |   |   +-- components/
|   |   |   |   +-- notification-center.tsx
|   |   |   |   +-- notification-item.tsx
|   |   |   |   +-- reminder-form.tsx
|   |   |   |   +-- notification-bell.tsx
|   |   |   +-- actions.ts
|   |   |   +-- queries.ts
|   |   |   +-- types.ts
|   |   |   +-- constants.ts
|   |   |   +-- utils.ts
|   |   |
|   |   +-- b7-social/
|   |   |   +-- components/
|   |   |   |   +-- buddy-list.tsx
|   |   |   |   +-- buddy-request-card.tsx
|   |   |   |   +-- achievement-badge.tsx
|   |   |   |   +-- achievement-gallery.tsx
|   |   |   |   +-- share-card.tsx
|   |   |   +-- actions.ts
|   |   |   +-- queries.ts
|   |   |   +-- types.ts
|   |   |   +-- constants.ts
|   |   |   +-- utils.ts
|   |   |
|   |   +-- b8-visualization/
|   |       +-- components/
|   |       |   +-- study-heatmap.tsx
|   |       |   +-- progress-line-chart.tsx
|   |       |   +-- daily-bar-chart.tsx
|   |       |   +-- risk-trend-chart.tsx
|   |       |   +-- session-distribution.tsx
|   |       |   +-- course-comparison.tsx
|   |       +-- queries.ts
|   |       +-- types.ts
|   |       +-- constants.ts
|   |       +-- utils.ts               # Chart data transformation helpers
|   |
|   +-- components/                    # Shared components
|   |   +-- ui/                        # shadcn/ui base components
|   |   |   +-- button.tsx
|   |   |   +-- card.tsx
|   |   |   +-- dialog.tsx
|   |   |   +-- input.tsx
|   |   |   +-- select.tsx
|   |   |   +-- badge.tsx
|   |   |   +-- toast.tsx
|   |   |   +-- skeleton.tsx
|   |   |   +-- dropdown-menu.tsx
|   |   |   +-- tabs.tsx
|   |   |   +-- ... (other shadcn components)
|   |   +-- shared/                    # Shared layout & utility components
|   |       +-- sidebar.tsx            # App sidebar navigation
|   |       +-- header.tsx             # App header with user menu
|   |       +-- page-header.tsx        # Reusable page title + description
|   |       +-- empty-state.tsx        # Empty state placeholder
|   |       +-- error-boundary.tsx     # Error boundary wrapper
|   |       +-- loading-spinner.tsx    # Consistent loading indicator
|   |       +-- confirm-dialog.tsx     # Reusable confirmation dialog
|   |
|   +-- lib/                           # Shared libraries & utilities
|   |   +-- supabase/
|   |   |   +-- browser.ts            # createBrowserClient() for client components
|   |   |   +-- server.ts             # createServerClient() for server components/actions
|   |   |   +-- admin.ts              # createAdminClient() with service role key
|   |   |   +-- middleware.ts          # Supabase middleware helper (session refresh)
|   |   +-- types/
|   |   |   +-- database.ts           # Supabase generated types (from supabase gen types)
|   |   |   +-- shared.ts             # Shared application types (enums, common interfaces)
|   |   +-- utils/
|   |       +-- dates.ts              # Date/time formatting & timezone helpers
|   |       +-- formatting.ts         # Number/string formatting helpers
|   |       +-- validation.ts         # Shared Zod schemas for form validation
|   |       +-- constants.ts          # App-wide constants
|   |
|   +-- middleware.ts                  # Next.js middleware (auth guard + session refresh)
|
+-- supabase/                          # Supabase local development & migrations
|   +-- config.toml                    # Supabase local config
|   +-- seed.sql                       # Seed data for development
|   +-- migrations/
|       +-- 00001_create_user_profiles.sql
|       +-- 00002_create_courses.sql
|       +-- 00003_create_study_sessions.sql
|       +-- 00004_create_daily_stats.sql
|       +-- 00005_create_ai_analyses.sql
|       +-- 00006_create_weekly_reports.sql
|       +-- 00007_create_notifications.sql
|       +-- 00008_create_reminder_schedules.sql
|       +-- 00009_create_study_buddies.sql
|       +-- 00010_create_achievements.sql
|       +-- 00011_create_rls_policies.sql
|       +-- 00012_create_indexes.sql
|       +-- 00013_create_functions.sql
|
+-- .env.example                       # Environment variable template
+-- .env.local                         # Local env vars (git-ignored)
+-- .gitignore
+-- next.config.js                     # Next.js configuration
+-- tailwind.config.ts                 # Tailwind CSS configuration
+-- tsconfig.json                      # TypeScript configuration
+-- package.json
+-- README.md
+-- vercel.json                        # Vercel deployment config (cron jobs)
```

---

## 4. Block Dependency Graph

### 4.1 Layered Architecture

The system follows a three-layer architecture: Foundation (shared infrastructure), Feature Blocks (the 8 independent modules), and Integration (the page-level composition).

```
+====================================================================+
|                      INTEGRATION LAYER                              |
|                                                                     |
|   Next.js App Router pages compose block components into views.     |
|   Each page.tsx imports components from the relevant block(s).      |
+====================================================================+
         |          |          |          |          |
         v          v          v          v          v
+====================================================================+
|                      FEATURE BLOCKS LAYER                           |
|                                                                     |
|  +--------+  +--------+  +--------+  +--------+                    |
|  |   B1   |  |   B2   |  |   B3   |  |   B4   |                    |
|  |  User  |  | Course |  |Progress|  |   AI   |                    |
|  |Profile |  |  Mgmt  |  |Tracking|  |Analysis|                    |
|  +--------+  +--------+  +--------+  +--------+                    |
|                                                                     |
|  +--------+  +--------+  +--------+  +--------+                    |
|  |   B5   |  |   B6   |  |   B7   |  |   B8   |                    |
|  | Dash-  |  | Notif- |  | Social |  | Visual-|                    |
|  | board  |  |ications|  |        |  | ization|                    |
|  +--------+  +--------+  +--------+  +--------+                    |
+====================================================================+
         |          |          |          |
         v          v          v          v
+====================================================================+
|                      FOUNDATION LAYER                               |
|                                                                     |
|  +-------------+  +-----------+  +----------+  +----------------+  |
|  | Supabase    |  | Shared    |  | shadcn/  |  | Middleware      |  |
|  | Clients     |  | Types &   |  | ui       |  | (Auth Guard)   |  |
|  | (lib/)      |  | Utils     |  |Components|  |                |  |
|  +-------------+  +-----------+  +----------+  +----------------+  |
+====================================================================+
```

### 4.2 Block Dependency Diagram (Data Flows)

Arrows indicate **data reads**. Blocks write only to their own tables but may read from other blocks' tables via Supabase queries.

```
                    +----------+
                    |    B1    |
                    |  User    |
                    |  Profile |
                    +----+-----+
                         |
           (user_profiles read by all blocks)
                         |
         +-------+-------+-------+-------+-------+-------+-------+
         |       |       |       |       |       |       |       |
         v       v       v       v       v       v       v       v
       +---+   +---+   +---+   +---+   +---+   +---+   +---+   +---+
       |B2 |   |B3 |   |B4 |   |B5 |   |B6 |   |B7 |   |B8 |   |...|
       +---+   +---+   +---+   +---+   +---+   +---+   +---+   +---+

     B2 (courses)
       |
       +-------> B3 reads courses (to associate sessions with courses)
       +-------> B4 reads courses (to analyze per-course patterns)
       +-------> B5 reads courses (to display course cards)
       +-------> B8 reads courses (to chart course progress)

     B3 (study_sessions, daily_stats)
       |
       +-------> B4 reads sessions + stats (for AI analysis input)
       +-------> B5 reads sessions + stats (for dashboard summary)
       +-------> B8 reads sessions + stats (for visualization)

     B4 (ai_analyses, weekly_reports)
       |
       +-------> B5 reads analyses (to show risk alerts on dashboard)
       +-------> B6 reads analyses (to trigger risk notifications)
       +-------> B8 reads analyses (to chart risk trends)

     B6 (notifications)
       |
       +-------> B5 reads notifications (to show notification preview)

     B7 (study_buddies, achievements)
       |
       +-------> B5 reads achievements (to show on dashboard)
```

### 4.3 Simplified Dependency Chain

```
                 +------+
                 |  B1  |  User Profile (foundation data)
                 +--+---+
                    |
              +-----+-----+
              |           |
           +--+--+     +--+--+
           | B2  |     | B7  |  Courses & Social (independent)
           +--+--+     +--+--+
              |           |
           +--+--+        +--------> B5 reads
           | B3  |                   B8 reads
           +--+--+
              |
           +--+--+
           | B4  |  AI Analysis (needs B2 + B3 data)
           +--+--+
              |
           +--+--+
           | B6  |  Notifications (needs B4 outputs)
           +-----+
              |
     +--------+--------+
     |                  |
  +--+--+           +---+--+
  | B5  |           |  B8  |  Dashboard & Visualizations (read everything)
  +-----+           +------+
```

### 4.4 Resolving Soft Dependencies

Blocks have **soft dependencies** on each other's data, not on each other's code. These are resolved through:

1. **Database Contracts:** The shared `lib/types/database.ts` file (generated by `supabase gen types typescript`) defines the exact schema of every table. All blocks code against these types. If a table schema changes, the types are regenerated and TypeScript catches any breakage.

2. **Seed Data:** The `supabase/seed.sql` file provides realistic test data for all 10 tables. A developer working on B5 (Dashboard) does not need B2 (Course Management) to be built yet -- they query the `courses` table directly using seed data.

3. **Interface-First Development:** Before any block is built, all table schemas and shared types are defined and agreed upon. Each block developer receives:
   - The full database schema (all 10 tables)
   - The shared type definitions
   - Seed data to populate all tables
   - The API contract for any cross-block data they need to read

4. **No Cross-Block Imports:** Block code (`src/blocks/b2-course-management/`) never imports from another block (`src/blocks/b3-progress-tracking/`). If B5 needs to display course data AND session data, it imports from `lib/types/database.ts` and queries Supabase directly. It may reuse a UI component from a block only if that component is extracted to `src/components/shared/`.

---

## 5. Table Ownership Matrix

| Table                | Owner Block | Read By              | Write By   | Description                                    |
| -------------------- | ----------- | -------------------- | ---------- | ---------------------------------------------- |
| `user_profiles`      | **B1**      | All blocks           | B1         | User preferences, onboarding state, settings   |
| `courses`            | **B2**      | B3, B4, B5, B8       | B2         | Course metadata, status, priority              |
| `study_sessions`     | **B3**      | B4, B5, B8           | B3         | Individual study session records                |
| `daily_stats`        | **B3**      | B4, B5, B8           | B3         | Aggregated daily study statistics               |
| `ai_analyses`        | **B4**      | B5, B6, B8           | B4         | AI-generated analyses and risk scores           |
| `weekly_reports`     | **B4**      | B5, B6               | B4         | AI-generated weekly summary reports             |
| `notifications`      | **B6**      | B5                   | B6         | User notifications (all types)                  |
| `reminder_schedules` | **B6**      | _(B6 only)_          | B6         | Scheduled reminder configurations               |
| `study_buddies`      | **B7**      | B5                   | B7         | Study buddy relationships                       |
| `achievements`       | **B7**      | B5                   | B7         | User achievement/badge records                  |

**Ownership Rules:**

- **Write Access:** Only the owner block writes to its tables. This is enforced by convention (code review) and by keeping all mutations in the owner block's `actions.ts`.
- **Read Access:** Any block may read from any table via Supabase queries. The "Read By" column lists the primary consumers, but it is not a restriction.
- **Schema Changes:** Only the owner block's developer may propose schema changes to their table. Changes must be coordinated with all consumers listed in "Read By."

---

## 6. Communication Patterns

### 6.1 Core Principle: Database as the Communication Bus

Blocks do NOT import code from each other. All inter-block communication happens through the PostgreSQL database. This makes blocks independently deployable, testable, and replaceable.

```
+--------+                                          +--------+
|  B3    |  INSERT INTO study_sessions ...           |  B4    |
|Progress| -------> [  PostgreSQL  ] <-------------- |   AI   |
|Tracking|          [  (Supabase)  ]  SELECT FROM    |Analysis|
+--------+          [              ]  study_sessions  +--------+
                    +--------------+
```

### 6.2 Shared Types as the Interface Contract

All blocks agree on types defined in `src/lib/types/`:

```typescript
// src/lib/types/database.ts  (auto-generated by Supabase CLI)
export type Database = {
  public: {
    Tables: {
      user_profiles: { Row: {...}; Insert: {...}; Update: {...} }
      courses:       { Row: {...}; Insert: {...}; Update: {...} }
      study_sessions:{ Row: {...}; Insert: {...}; Update: {...} }
      // ... all 10 tables
    }
  }
}

// src/lib/types/shared.ts  (manually maintained)
export type CourseStatus = 'not_started' | 'in_progress' | 'completed' | 'dropped'
export type Priority = 'high' | 'medium' | 'low'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type NotificationType = 'reminder' | 'risk_alert' | 'achievement' | 'buddy' | 'system'
// ... all shared enums and interfaces
```

### 6.3 Supabase Realtime for Live Updates

Certain views subscribe to Supabase Realtime channels for live updates without polling:

```
+-----------+         +------------------+         +-----------+
|  Client   | <====== | Supabase Realtime| <====== | Database  |
|  Browser  | ws://   | (WebSocket)      |  INSERT | Tables    |
+-----------+         +------------------+         +-----------+

Subscriptions:
  - Dashboard (B5) subscribes to: notifications, study_sessions, ai_analyses
  - Notification bell (B6) subscribes to: notifications
  - Study timer (B3) subscribes to: study_sessions (own active session)
  - Buddy updates (B7) subscribes to: study_buddies
```

Implementation pattern in a client component:

```typescript
// Example: Realtime subscription in a client component
'use client'

import { createBrowserClient } from '@/lib/supabase/browser'
import { useEffect, useState } from 'react'

export function NotificationBell() {
  const [count, setCount] = useState(0)
  const supabase = createBrowserClient()

  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => setCount(prev => prev + 1)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  return <span>{count}</span>
}
```

### 6.4 Server Actions Pattern

Each block that performs writes has its own `actions.ts` file containing Next.js Server Actions. Pages invoke actions from the relevant block.

```
  Page (src/app/(app)/courses/new/page.tsx)
    |
    |  imports createCourse action
    v
  Block Action (src/blocks/b2-course-management/actions.ts)
    |
    |  'use server'
    |  validates input with Zod
    |  creates Supabase server client
    |  performs INSERT
    |  revalidates path
    v
  Supabase PostgreSQL
```

Example server action:

```typescript
// src/blocks/b2-course-management/actions.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { courseSchema } from './types'

export async function createCourse(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const validated = courseSchema.parse({
    title: formData.get('title'),
    platform: formData.get('platform'),
    url: formData.get('url'),
    estimated_hours: Number(formData.get('estimated_hours')),
    priority: formData.get('priority'),
  })

  const { error } = await supabase
    .from('courses')
    .insert({ ...validated, user_id: user.id })

  if (error) throw new Error(error.message)
  revalidatePath('/courses')
}
```

### 6.5 Import Rules Summary

| Import Source               | Allowed Importers                          |
| --------------------------- | ------------------------------------------ |
| `src/lib/*`                 | Any block, any page, any component         |
| `src/components/ui/*`       | Any block, any page                        |
| `src/components/shared/*`   | Any block, any page                        |
| `src/blocks/bX/*`           | Only `src/app/` pages and that block itself |
| `src/blocks/bX/actions.ts`  | Only `src/app/` pages (invoked as actions)  |
| `src/blocks/bX/components/` | Only `src/app/` pages for that feature      |

**Forbidden imports:**

- `src/blocks/b2-*/` importing from `src/blocks/b3-*/` (cross-block)
- `src/blocks/*/` importing from `src/app/` (block should not know about routing)

---

## 7. Data Flow Diagrams

### 7.1 User Logs a Study Session

```
  User clicks "Start Study" on Dashboard
       |
       v
  [B3 study-timer.tsx]  (client component)
       |  Start timer (client-side state)
       |  Call startSession server action
       v
  [B3 actions.ts :: startSession]
       |  INSERT INTO study_sessions
       |    (status: 'active', started_at: now())
       v
  [PostgreSQL: study_sessions]
       |
       |  ... user studies ...
       |
  User clicks "Stop"
       |
       v
  [B3 actions.ts :: endSession]
       |  UPDATE study_sessions SET
       |    status='completed', ended_at=now(),
       |    duration_minutes = diff(started_at, now())
       v
  [PostgreSQL: study_sessions]
       |
       |  (Supabase Realtime fires INSERT/UPDATE event)
       |
       +----> [B5 Dashboard]     Realtime subscription updates today's stats
       |
       v
  [API Route: /api/cron/daily-stats]  (runs every hour via Vercel Cron)
       |  SELECT SUM(duration_minutes)
       |    FROM study_sessions
       |    WHERE date = today
       |  UPSERT daily_stats
       v
  [PostgreSQL: daily_stats]
       |
       |  (Updated daily_stats available for next AI analysis run)
       |
       +----> [B4 AI Analysis]   Picks up new data in next cron cycle
       +----> [B8 Visualization] Charts reflect updated stats on next load
```

### 7.2 AI Analysis Pipeline

```
  [Vercel Cron: every Sunday 6 AM UTC]
       |
       v
  [API Route: /api/cron/ai-analysis]
       |  Verify cron secret (CRON_SECRET header)
       |  Create admin Supabase client
       v
  [Gather Data Phase]
       |  SELECT * FROM user_profiles WHERE ai_analysis_enabled = true
       |  For each eligible user:
       |    +-- SELECT * FROM courses WHERE user_id = ?
       |    +-- SELECT * FROM study_sessions WHERE user_id = ? AND last 7 days
       |    +-- SELECT * FROM daily_stats WHERE user_id = ? AND last 30 days
       |    +-- SELECT * FROM ai_analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
       v
  [Build Prompt Phase]
       |  Compose system prompt + user data into structured prompt
       |  Include: study patterns, streak info, course progress,
       |           previous analysis for continuity
       v
  [Call GPT-4]
       |  POST https://api.openai.com/v1/chat/completions
       |  Model: gpt-4
       |  Response format: structured JSON
       |  Max tokens: 2000
       v
  [Parse Response Phase]
       |  Validate JSON structure
       |  Extract: risk_scores[], recommendations[],
       |           patterns_detected[], interventions[]
       v
  [Store Results Phase]
       |  INSERT INTO ai_analyses (
       |    user_id, analysis_type, risk_scores,
       |    recommendations, patterns, raw_response,
       |    tokens_used, model_version
       |  )
       |
       |  If Sunday: also generate weekly_report
       |  INSERT INTO weekly_reports (
       |    user_id, week_start, week_end,
       |    summary, highlights, areas_for_improvement,
       |    next_week_goals
       |  )
       v
  [Trigger Notifications Phase]
       |  For each user with risk_score > threshold:
       |    INSERT INTO notifications (
       |      user_id, type: 'risk_alert',
       |      title, body, metadata, priority
       |    )
       v
  [PostgreSQL: ai_analyses, weekly_reports, notifications]
       |
       +----> B5 Dashboard shows latest risk scores
       +----> B6 Notification bell shows new alerts
       +----> B8 Visualization updates risk trend chart
```

### 7.3 Dashboard Load (Parallel Data Fetching)

```
  User navigates to /dashboard
       |
       v
  [Next.js App Router: src/app/(app)/dashboard/page.tsx]
       |  Server Component (renders on server)
       |
       |  Parallel data fetching using Promise.all()
       |
       +----> [B5 queries.ts :: getTodayStats()]
       |        SELECT * FROM daily_stats WHERE date = today
       |
       +----> [B5 queries.ts :: getActiveCourses()]
       |        SELECT * FROM courses
       |          WHERE status = 'in_progress'
       |          ORDER BY priority
       |
       +----> [B5 queries.ts :: getRecentSessions()]
       |        SELECT * FROM study_sessions
       |          ORDER BY created_at DESC LIMIT 5
       |
       +----> [B5 queries.ts :: getLatestAnalysis()]
       |        SELECT * FROM ai_analyses
       |          ORDER BY created_at DESC LIMIT 1
       |
       +----> [B5 queries.ts :: getUnreadNotificationCount()]
       |        SELECT count(*) FROM notifications
       |          WHERE read = false
       |
       +----> [B5 queries.ts :: getRecentAchievements()]
                SELECT * FROM achievements
                  WHERE unlocked_at > (now() - interval '7 days')
       |
       v  (all queries resolve in parallel)
       |
  [Compose Dashboard View]
       |
       +-- <TodaySummary stats={todayStats} />          (B5 component)
       +-- <CourseOverviewCards courses={courses} />     (B5 component)
       +-- <RecentActivity sessions={sessions} />       (B5 component)
       +-- <AiInsightsPanel analysis={analysis} />      (B5 component)
       +-- <QuickActions />                             (B5 component)
       |
       v
  [HTML streamed to client]
       |
       v
  [Client-side hydration]
       |  Realtime subscriptions start
       |  Study timer state restored (if active session exists)
       v
  [Live Dashboard]
```

---

## 8. Authentication & Authorization

### 8.1 Authentication Flow

```
  User visits /login
       |
       v
  [Login Page]  (client component with form)
       |  supabase.auth.signInWithPassword({ email, password })
       v
  [Supabase Auth]
       |  Validates credentials
       |  Returns JWT access token + refresh token
       |  Sets cookies via Supabase SSR helpers
       v
  [Redirect to /dashboard]
       |
       v
  [Next.js Middleware]
       |  Reads session from cookies
       |  Refreshes token if expired
       |  Allows access to (app) routes
       v
  [Dashboard loads with authenticated Supabase client]
```

### 8.2 Middleware Route Protection

```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes: redirect to login if no session
  if (request.nextUrl.pathname.startsWith('/(app)') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Auth routes: redirect to dashboard if already logged in
  if (request.nextUrl.pathname.startsWith('/(auth)') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)'],
}
```

### 8.3 Row Level Security (RLS) Policies

Every table has RLS enabled. The fundamental policy pattern is: **users can only access their own rows.** This is enforced at the database level, making it impossible for application bugs to leak data between users.

```sql
-- Example RLS policies for the courses table (B2)

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Users can only see their own courses
CREATE POLICY "Users can view own courses"
  ON courses FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert courses for themselves
CREATE POLICY "Users can insert own courses"
  ON courses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own courses
CREATE POLICY "Users can update own courses"
  ON courses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own courses
CREATE POLICY "Users can delete own courses"
  ON courses FOR DELETE
  USING (auth.uid() = user_id);
```

Special policies for social features:

```sql
-- study_buddies: users can see rows where they are either party
CREATE POLICY "Users can view own buddy relationships"
  ON study_buddies FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = buddy_id);

-- achievements: users can view buddies' achievements (if sharing is enabled)
CREATE POLICY "Users can view buddy achievements"
  ON achievements FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM study_buddies
      WHERE status = 'accepted'
      AND (
        (user_id = auth.uid() AND buddy_id = achievements.user_id)
        OR
        (buddy_id = auth.uid() AND user_id = achievements.user_id)
      )
    )
  );
```

### 8.4 Service Role Key (Admin Access)

The service role key bypasses RLS and is used exclusively for:

- **Cron jobs** (API routes in `/api/cron/*`) that process data across all users
- **Webhook handlers** that need to write to tables on behalf of the system
- **Admin operations** like generating reports or cleaning up stale data

```typescript
// src/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,  // Never expose to client
    { auth: { persistSession: false } }
  )
}
```

**Security rules for the service role key:**

- Never exposed in client-side code or `NEXT_PUBLIC_` environment variables
- Only used in server-side code (`route.ts` API handlers, server actions)
- Cron API routes verify the `CRON_SECRET` header before proceeding
- All admin operations are logged for audit purposes

---

## 9. AI Pipeline Architecture

### 9.1 Pipeline Overview

```
+-----------------------------------------------------------------------+
|                        AI ANALYSIS PIPELINE                            |
|                                                                        |
|  +-----------+     +-----------+     +----------+     +------------+  |
|  |  TRIGGER  | --> |  GATHER   | --> |  BUILD   | --> |  CALL      |  |
|  |           |     |  DATA     |     |  PROMPT  |     |  GPT-4     |  |
|  | - Cron    |     |           |     |          |     |            |  |
|  | - Manual  |     | - Profile |     | - System |     | - API call |  |
|  | - Event   |     | - Courses |     |   prompt |     | - Streaming|  |
|  |           |     | - Sessions|     | - User   |     |   (opt.)   |  |
|  |           |     | - Stats   |     |   context|     |            |  |
|  |           |     | - Prev.   |     | - Output |     |            |  |
|  |           |     |   analysis|     |   schema |     |            |  |
|  +-----------+     +-----------+     +----------+     +------------+  |
|                                                             |          |
|  +------------+     +-----------+     +----------+          |          |
|  |  NOTIFY    | <-- |  STORE    | <-- |  PARSE   | <--------+         |
|  |            |     |           |     |          |                     |
|  | - Risk     |     | - ai_     |     | - JSON   |                     |
|  |   alerts   |     |   analyses|     |   parse  |                     |
|  | - Weekly   |     | - weekly_ |     | - Schema |                     |
|  |   digest   |     |   reports |     |   valid. |                     |
|  | - Insights |     |           |     | - Retry  |                     |
|  |            |     |           |     |   on fail|                     |
|  +------------+     +-----------+     +----------+                     |
+-----------------------------------------------------------------------+
```

### 9.2 Trigger Mechanisms

| Trigger        | Schedule                | Route                          | Purpose                                      |
| -------------- | ----------------------- | ------------------------------ | -------------------------------------------- |
| Weekly Cron    | Every Sunday 6:00 UTC   | `POST /api/cron/ai-analysis`   | Full weekly analysis for all active users     |
| Daily Stats    | Every day at 00:30 UTC  | `POST /api/cron/daily-stats`   | Aggregate daily study data                    |
| Streak Check   | Every day at 01:00 UTC  | `POST /api/cron/streak-check`  | Update streak counts, flag at-risk streaks    |
| Notifications  | Every 15 minutes        | `POST /api/cron/notifications` | Process pending reminder schedules            |
| Manual Trigger | On-demand (user clicks) | `POST /api/ai/analyze`         | Single-user analysis (rate limited)           |

Vercel cron configuration:

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/ai-analysis",
      "schedule": "0 6 * * 0"
    },
    {
      "path": "/api/cron/daily-stats",
      "schedule": "30 0 * * *"
    },
    {
      "path": "/api/cron/streak-check",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/cron/notifications",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

### 9.3 Prompt Engineering Strategy

The AI analysis uses a structured prompt with explicit output schema:

```
SYSTEM PROMPT:
  You are a learning analytics AI that analyzes study patterns and predicts
  course completion risk. You are empathetic but honest. Your goal is to help
  users stay accountable and complete their courses.

  Respond ONLY in valid JSON matching this schema:
  {
    "risk_scores": [
      { "course_id": "uuid", "score": 0-100, "factors": ["string"] }
    ],
    "recommendations": [
      { "type": "encouragement|warning|intervention|tip",
        "priority": "low|medium|high",
        "message": "string",
        "course_id": "uuid|null" }
    ],
    "patterns_detected": [
      { "pattern": "string", "sentiment": "positive|negative|neutral" }
    ],
    "weekly_summary": "string (2-3 paragraphs)",
    "focus_areas": ["string"]
  }

USER CONTEXT:
  [Injected: profile, courses, sessions, stats, previous analysis]
```

### 9.4 Rate Limiting Strategy

| Limit Type             | Constraint                | Implementation                          |
| ---------------------- | ------------------------- | --------------------------------------- |
| Manual analysis        | 3 per user per day        | Counter in `user_profiles.daily_ai_requests` reset by cron |
| GPT-4 API calls        | 60 RPM (account level)    | Queue with exponential backoff          |
| Token budget per user  | 4,000 tokens per analysis | Prompt truncation if context is too long |
| Cron batch processing  | 50 users per invocation   | Pagination with cursor-based batching   |

### 9.5 Error Handling and Retry Logic

```
  [Call GPT-4]
       |
       +-- Success (200) -----> [Parse JSON]
       |                              |
       |                              +-- Valid JSON -----> [Store]
       |                              |
       |                              +-- Invalid JSON ---> [Retry with
       |                                                      stricter prompt]
       |                                                      (max 1 retry)
       |
       +-- Rate Limited (429) -> [Exponential backoff]
       |                          Wait: 2s, 4s, 8s, 16s
       |                          (max 3 retries)
       |
       +-- Server Error (5xx) -> [Retry after 5s]
       |                          (max 2 retries)
       |
       +-- All retries failed -> [Log error]
                                  [Store partial result with error flag]
                                  [Skip this user, continue batch]
```

### 9.6 Token Usage Optimization

Strategies to minimize OpenAI API costs:

1. **Context Windowing:** Only include the last 7 days of sessions and 30 days of daily stats, not the entire history.
2. **Incremental Analysis:** Include the previous analysis summary so GPT-4 can build on prior insights rather than re-deriving them.
3. **Prompt Compression:** Remove redundant fields, use abbreviations in the data payload, and strip null values.
4. **Batched Processing:** Group analysis requests to minimize per-request overhead.
5. **Token Tracking:** Store `tokens_used` (prompt + completion) in `ai_analyses` for monitoring and budgeting.
6. **Model Selection:** Use `gpt-4` for weekly deep analyses and `gpt-4-turbo` (or `gpt-4o`) for on-demand quick checks to balance cost and quality.

---

## 10. Deployment Architecture

### 10.1 Infrastructure Diagram

```
+-------------------------------------------------------------------+
|                         PRODUCTION                                 |
|                                                                    |
|  +-------------------------------------------------------------+  |
|  |                    Vercel Platform                            |  |
|  |                                                               |  |
|  |  +-------------------+  +------------------+  +------------+ |  |
|  |  | Edge Network      |  | Serverless Funcs |  | Cron Jobs  | |  |
|  |  | (CDN + SSR)       |  | (API Routes)     |  | (Scheduled)| |  |
|  |  |                   |  |                  |  |            | |  |
|  |  | - Static assets   |  | - /api/cron/*   |  | - Weekly   | |  |
|  |  | - RSC rendering   |  | - /api/ai/*     |  |   analysis | |  |
|  |  | - Middleware       |  | - /api/auth/*   |  | - Daily    | |  |
|  |  | - Edge caching    |  | - /api/webhooks |  |   stats    | |  |
|  |  +-------------------+  +------------------+  +------------+ |  |
|  +-------------------------------------------------------------+  |
|                     |                    |                          |
+-------------------------------------------------------------------+
                      |                    |
          +-----------+----------+   +-----+--------+
          |                      |   |              |
          v                      v   v              v
  +--------------+    +------------------+   +------------+
  | Supabase     |    | Supabase         |   | OpenAI     |
  | Project      |    | Auth             |   | API        |
  |              |    |                  |   |            |
  | - PostgreSQL |    | - JWT issuing    |   | - GPT-4    |
  | - Realtime   |    | - Session mgmt   |   | - Analysis |
  | - Storage    |    | - Email confirm  |   |            |
  | - Edge Funcs |    | - OAuth providers|   |            |
  +--------------+    +------------------+   +------------+
```

### 10.2 Environment Variables

All environment variables are managed through Vercel's Environment Variables dashboard. They are organized by scope:

| Variable                           | Scope          | Used By                  | Description                            |
| ---------------------------------- | -------------- | ------------------------ | -------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`         | Public         | Browser + Server         | Supabase project URL                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`    | Public         | Browser + Server         | Supabase anonymous (public) key        |
| `SUPABASE_SERVICE_ROLE_KEY`        | Server only    | API routes, cron jobs    | Supabase admin key (bypasses RLS)      |
| `OPENAI_API_KEY`                   | Server only    | AI analysis pipeline     | OpenAI API key                         |
| `CRON_SECRET`                      | Server only    | Cron API routes          | Secret to verify cron job requests     |
| `NEXT_PUBLIC_APP_URL`              | Public         | Email templates, sharing | Production URL of the app              |

**Security rules:**

- Variables prefixed with `NEXT_PUBLIC_` are safe for client-side exposure.
- All other variables are server-side only and never bundled into client code.
- `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` are highly sensitive -- rotate periodically.
- Different values for Preview, Development, and Production environments.

### 10.3 Deployment Pipeline

```
  Developer pushes to main (or merges PR)
       |
       v
  [Vercel Build Pipeline]
       |
       +-- Install dependencies (npm ci)
       +-- Type check (tsc --noEmit)
       +-- Lint (eslint)
       +-- Build (next build)
       |     +-- Static pages pre-rendered
       |     +-- Server components compiled
       |     +-- API routes bundled as serverless functions
       |     +-- Middleware compiled for edge runtime
       |
       v
  [Vercel Deployment]
       |
       +-- Atomic deployment (instant rollback available)
       +-- Edge network propagation (~seconds)
       +-- Cron jobs registered/updated from vercel.json
       +-- Preview URL generated for PRs
       v
  [Production Live]
```

### 10.4 Cron Job Scheduling

Vercel Cron Jobs invoke API routes on a schedule. Each cron route:

1. Verifies the `CRON_SECRET` authorization header.
2. Creates a Supabase admin client (service role).
3. Performs the scheduled work.
4. Returns a response indicating success or failure.

```typescript
// Example: /api/cron/daily-stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Aggregate daily stats for all users who had sessions today
  // ... aggregation logic ...

  return NextResponse.json({ success: true, usersProcessed: count })
}
```

### 10.5 Database Migrations

Database schema changes are managed through Supabase migrations:

```
  Developer creates migration locally
       |
       v
  supabase migration new <name>
       |  Creates timestamped SQL file in supabase/migrations/
       v
  Developer writes SQL (CREATE TABLE, ALTER TABLE, CREATE POLICY, etc.)
       |
       v
  supabase db push  (for local development)
       |  OR
  supabase db push --linked  (for staging/production via Supabase dashboard)
       v
  Migration applied to target database
       |
       v
  supabase gen types typescript --linked > src/lib/types/database.ts
       |  Regenerate TypeScript types to match new schema
       v
  Commit updated types + migration file
```

### 10.6 Monitoring and Observability

| Concern          | Tool                     | Details                                               |
| ---------------- | ------------------------ | ----------------------------------------------------- |
| Application logs | Vercel Logs              | Serverless function logs, build logs, edge logs        |
| Database metrics | Supabase Dashboard       | Query performance, connection pool, storage usage      |
| Error tracking   | Vercel (built-in)        | Runtime errors, function timeouts, build failures      |
| AI pipeline      | Custom logging           | Token usage, response times, error rates stored in DB  |
| Uptime           | Vercel Analytics         | Core Web Vitals, page load times, function duration    |
| Cron monitoring  | Vercel Cron Logs         | Execution history, success/failure, duration           |

---

## Appendix A: Quick Reference for Block Developers

### Getting Started

1. Clone the repo and run `npm install`.
2. Copy `.env.example` to `.env.local` and fill in credentials.
3. Run `supabase start` to launch local Supabase.
4. Run `supabase db push` to apply all migrations.
5. Run `supabase db seed` to populate test data.
6. Run `npm run dev` to start the Next.js dev server.

### Block Development Checklist

- [ ] Read the shared types in `src/lib/types/database.ts` and `src/lib/types/shared.ts`
- [ ] Create your block directory under `src/blocks/bX-name/`
- [ ] Define block-specific types in `types.ts`
- [ ] Implement Supabase queries in `queries.ts`
- [ ] Implement server actions in `actions.ts` (if your block writes data)
- [ ] Build components in `components/`
- [ ] Wire up page routes in `src/app/(app)/your-route/`
- [ ] Test with seed data -- do not depend on other blocks being built
- [ ] Ensure all Supabase queries use the typed client for type safety

### File Naming Conventions

- Components: `kebab-case.tsx` (e.g., `course-card.tsx`)
- Actions: `actions.ts` (one per block)
- Queries: `queries.ts` (one per block)
- Types: `types.ts` (one per block)
- Utilities: `utils.ts` (one per block)
- Constants: `constants.ts` (one per block)

---

## Appendix B: Shared Type Definitions (Contract)

The following types are defined upfront and shared across all blocks. Changes to these types require coordination across affected blocks.

```typescript
// src/lib/types/shared.ts

// === Enums ===
export type CourseStatus = 'not_started' | 'in_progress' | 'completed' | 'dropped'
export type Priority = 'high' | 'medium' | 'low'
export type SessionStatus = 'active' | 'paused' | 'completed' | 'cancelled'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type NotificationType = 'reminder' | 'risk_alert' | 'achievement' | 'buddy' | 'system'
export type NotificationChannel = 'in_app' | 'email' | 'push'
export type BuddyStatus = 'pending' | 'accepted' | 'declined' | 'removed'
export type AnalysisType = 'weekly' | 'on_demand' | 'triggered'
export type RecommendationType = 'encouragement' | 'warning' | 'intervention' | 'tip'

// === Common Interfaces ===
export interface RiskScore {
  course_id: string
  score: number        // 0-100
  factors: string[]
}

export interface Recommendation {
  type: RecommendationType
  priority: Priority
  message: string
  course_id: string | null
}

export interface PatternDetected {
  pattern: string
  sentiment: 'positive' | 'negative' | 'neutral'
}

export interface AIAnalysisResult {
  risk_scores: RiskScore[]
  recommendations: Recommendation[]
  patterns_detected: PatternDetected[]
  weekly_summary: string
  focus_areas: string[]
}
```

---

_This document is the single source of truth for the system architecture. All block developers should read this before starting development. For questions or proposed changes, open a discussion in the project repository._

# Deployment Guide

This document covers everything needed to deploy the Course Accountability Tracker to production using Vercel, Supabase, and OpenAI.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Supabase Project Setup](#2-supabase-project-setup)
3. [Vercel Project Setup](#3-vercel-project-setup)
4. [Environment Variables](#4-environment-variables)
5. [Cron Job Configuration](#5-cron-job-configuration)
6. [Domain & SSL](#6-domain--ssl)
7. [Post-Deployment Verification](#7-post-deployment-verification)
8. [Monitoring & Maintenance](#8-monitoring--maintenance)
9. [Troubleshooting](#9-troubleshooting)
10. [Scaling Considerations](#10-scaling-considerations)

---

## 1. Prerequisites

Ensure the following are available before starting deployment:

| Requirement           | Minimum Version / Details                          | Required |
| --------------------- | -------------------------------------------------- | -------- |
| Node.js               | 18.x or later                                      | Yes      |
| npm or pnpm           | npm 9+ or pnpm 8+                                 | Yes      |
| Vercel account         | Free (Hobby) or Pro plan                           | Yes      |
| Supabase account       | Free or Pro plan                                   | Yes      |
| OpenAI API key         | GPT-4 access enabled                               | Yes      |
| GitHub repository      | Code pushed to a GitHub repo                       | Yes      |
| Resend API key         | For transactional email delivery                   | Optional |
| Web Push VAPID keys    | For browser push notifications                     | Optional |

### Generating VAPID Keys (if using Web Push)

```bash
npx web-push generate-vapid-keys
```

Save both the public and private keys -- you will need them for environment variables.

---

## 2. Supabase Project Setup

### 2.1 Create the Project

1. Go to [app.supabase.com](https://app.supabase.com) and sign in.
2. Click **New Project**.
3. Choose your organization, set a project name (e.g., `course-tracker-prod`), and pick a region close to your users.
4. Set a strong database password and save it securely.
5. Wait for the project to finish provisioning (1-2 minutes).

### 2.2 Collect Connection Details

From the Supabase dashboard, navigate to **Settings > API** and note:

- **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
- **Anon (public) key**: `eyJ...` (safe to expose to the client)
- **Service role key**: `eyJ...` (server-only, never expose to the client)

### 2.3 Run Database Migrations

**Option 1: Supabase CLI (recommended)**

```bash
# Install the Supabase CLI if not already installed
npm install -g supabase

# Link to your remote project
supabase link --project-ref your-project-ref

# Push all migrations
supabase db push
```

**Option 2: Manual SQL via Dashboard**

1. Open the Supabase dashboard and navigate to **SQL Editor**.
2. Copy the contents of `supabase/migrations/001_foundation.sql`.
3. Paste into the editor and click **Run**.
4. Repeat for any additional migration files in order.

### 2.4 Verify Seed Data (Optional)

If a seed file exists at `supabase/seed.sql`:

```bash
# Via CLI
supabase db reset  # WARNING: This resets the database and re-applies migrations + seed

# Via Dashboard
# Paste seed.sql contents into SQL Editor and run
```

### 2.5 Enable Row Level Security

RLS should be enabled by the migration scripts. Verify in the dashboard:

1. Navigate to **Table Editor**.
2. For each table, confirm the **RLS Enabled** badge is visible.
3. If any table is missing RLS, enable it:

```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### 2.6 Configure Authentication Providers

Navigate to **Authentication > Providers** in the Supabase dashboard.

**Email/Password** (enabled by default):
- Confirm email is enabled.
- Optionally enable "Confirm email" to require email verification.

**Google OAuth**:
1. Create OAuth credentials in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Set the authorized redirect URI to: `https://xxxxxxxxxxxx.supabase.co/auth/v1/callback`
3. Enter the Client ID and Client Secret in Supabase under **Auth > Providers > Google**.

**GitHub OAuth**:
1. Create an OAuth App in [GitHub Developer Settings](https://github.com/settings/developers).
2. Set the authorization callback URL to: `https://xxxxxxxxxxxx.supabase.co/auth/v1/callback`
3. Enter the Client ID and Client Secret in Supabase under **Auth > Providers > GitHub**.

### 2.7 Set Auth Redirect URLs

Navigate to **Authentication > URL Configuration**:

- **Site URL**: `https://your-domain.vercel.app`
- **Redirect URLs**: Add `https://your-domain.vercel.app/api/auth/callback`

If using a custom domain, add both the Vercel URL and the custom domain.

### 2.8 Enable Realtime for Notifications

The notification bell uses Supabase Realtime to show instant updates. Enable it for the notifications table:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

Run this in the SQL Editor or include it in a migration file.

---

## 3. Vercel Project Setup

### 3.1 Connect Repository

1. Go to [vercel.com](https://vercel.com) and sign in.
2. Click **Add New > Project**.
3. Import your GitHub repository.
4. Vercel auto-detects the Next.js framework.

### 3.2 Build Settings

Vercel auto-detects these settings for Next.js. Verify they are correct:

| Setting           | Value                                              |
| ----------------- | -------------------------------------------------- |
| Framework Preset  | Next.js                                            |
| Build Command     | `next build`                                       |
| Output Directory  | `.next`                                            |
| Install Command   | `npm install`                                      |
| Root Directory    | `./` (or `course-accountability-tracker/` if monorepo) |

### 3.3 Node.js Version

In **Settings > General**, set the Node.js version to **18.x** or **20.x**.

### 3.4 Deploy

1. Add all environment variables (see section 4 below) before the first deploy.
2. Click **Deploy** or push to the connected branch to trigger a deploy.
3. Vercel builds the project and provides a deployment URL.

---

## 4. Environment Variables

Set all environment variables in **Vercel > Project > Settings > Environment Variables**.

For local development, create a `.env.local` file in the project root with the same values.

### Required Variables

```bash
# ─── Supabase ────────────────────────────────────────────────────────
# The URL of your Supabase project (public, safe for client)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co

# The anon/public key for your Supabase project (public, safe for client)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# The service role key for server-side operations (SECRET, never expose to client)
# This key bypasses RLS -- use only in server actions and API routes
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ─── OpenAI ──────────────────────────────────────────────────────────
# Your OpenAI API key for GPT-4 analysis and report generation
OPENAI_API_KEY=sk-...

# ─── App ─────────────────────────────────────────────────────────────
# The public URL of your deployed application
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# A random secret string used to authenticate cron job requests
# Generate with: openssl rand -base64 32
CRON_SECRET=your-random-secret-for-cron-auth
```

### Optional Variables

```bash
# ─── Email via Resend (optional) ─────────────────────────────────────
# API key from resend.com for sending transactional emails
RESEND_API_KEY=re_...

# The sender email address (must be verified in Resend)
EMAIL_FROM=notifications@your-domain.com

# ─── Web Push (optional) ─────────────────────────────────────────────
# VAPID public key (safe for client, used in service worker registration)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BPn...

# VAPID private key (SECRET, used server-side to sign push messages)
VAPID_PRIVATE_KEY=your-vapid-private-key
```

### Auto-Set by Vercel

```bash
# Vercel automatically sets these -- do not set manually
VERCEL_URL        # The deployment URL (e.g., your-app-xxxx.vercel.app)
VERCEL_ENV        # "production", "preview", or "development"
```

### Security Notes

- Variables prefixed with `NEXT_PUBLIC_` are bundled into client-side JavaScript. Only use this prefix for values that are safe to expose publicly.
- `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `CRON_SECRET`, `RESEND_API_KEY`, and `VAPID_PRIVATE_KEY` must **never** have the `NEXT_PUBLIC_` prefix.
- In Vercel, you can scope environment variables to specific environments (Production, Preview, Development).

---

## 5. Cron Job Configuration

The application uses scheduled cron jobs for background processing. Configure them in `vercel.json` at the project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-analysis",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/weekly-report",
      "schedule": "0 3 * * 1"
    },
    {
      "path": "/api/cron/send-reminders",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/daily-stats",
      "schedule": "59 23 * * *"
    }
  ]
}
```

### Cron Schedule Reference

| Job              | Schedule          | Description                                          |
| ---------------- | ----------------- | ---------------------------------------------------- |
| `daily-analysis` | `0 2 * * *`       | Runs at 2:00 AM UTC daily. Triggers AI risk analysis for all active users. |
| `weekly-report`  | `0 3 * * 1`       | Runs at 3:00 AM UTC every Monday. Generates weekly study reports via GPT-4. |
| `send-reminders` | `*/15 * * * *`    | Runs every 15 minutes. Sends pending study reminders via email/push. |
| `daily-stats`    | `59 23 * * *`     | Runs at 11:59 PM UTC daily. Finalizes daily study statistics. |

### Cron Authentication

Each cron endpoint must verify the request is from Vercel's cron system. In your API route:

```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  // ... cron logic
}
```

### Vercel Plan Limitations

| Plan   | Cron Frequency Limit        | Daily Invocations |
| ------ | --------------------------- | ----------------- |
| Hobby  | Once per day minimum        | 1 per cron        |
| Pro    | Once per minute minimum     | Unlimited         |

If you are on the **Hobby plan**, the `send-reminders` job (every 15 minutes) will not work. Alternatives:
- Upgrade to the Vercel Pro plan.
- Use an external cron service such as [cron-job.org](https://cron-job.org), [Upstash QStash](https://upstash.com/docs/qstash), or [EasyCron](https://www.easycron.com).
- Reduce reminder frequency to once daily.

---

## 6. Domain & SSL

### Custom Domain Setup

1. In Vercel, navigate to **Project > Settings > Domains**.
2. Click **Add Domain** and enter your custom domain (e.g., `tracker.yourdomain.com`).
3. Vercel provides DNS records to configure:
   - **A Record**: Point `@` or subdomain to Vercel's IP (`76.76.21.21`).
   - **CNAME Record**: Point `www` or subdomain to `cname.vercel-dns.com`.
4. Add the DNS records in your domain registrar's dashboard.
5. Wait for DNS propagation (typically 5-30 minutes, up to 48 hours).

### SSL Certificate

Vercel automatically provisions and renews SSL certificates via Let's Encrypt. No manual configuration is needed.

### Update Auth Redirect URLs

After adding a custom domain, update the Supabase Auth configuration:

1. In Supabase, go to **Authentication > URL Configuration**.
2. Update **Site URL** to `https://tracker.yourdomain.com`.
3. Add `https://tracker.yourdomain.com/api/auth/callback` to **Redirect URLs**.
4. Keep the Vercel URL (`https://your-app.vercel.app`) in the redirect list for preview deployments.

---

## 7. Post-Deployment Verification

Run through this checklist after every production deployment:

### Core Functionality

- [ ] App loads at the production URL without errors
- [ ] Sign up with email/password works (user receives confirmation email if enabled)
- [ ] Sign in with Google OAuth works (redirects correctly, session created)
- [ ] Sign in with GitHub OAuth works (redirects correctly, session created)
- [ ] Sign out clears session and redirects to sign-in page
- [ ] New user is redirected to onboarding flow
- [ ] Existing user is redirected to dashboard

### Database & Security

- [ ] Supabase connection works (can read and write data from the app)
- [ ] RLS policies are active (attempt to access another user's data via API returns empty/error)
- [ ] Service role key is not visible in client-side JavaScript (check page source / network tab)

### Cron Jobs

- [ ] Cron jobs are registered (visible in Vercel dashboard under **Settings > Cron Jobs**)
- [ ] Manually trigger each cron endpoint with curl to verify they execute:

```bash
# Test daily analysis
curl -X GET https://your-domain.vercel.app/api/cron/daily-analysis \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Test weekly report
curl -X GET https://your-domain.vercel.app/api/cron/weekly-report \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Test send reminders
curl -X GET https://your-domain.vercel.app/api/cron/send-reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Test daily stats
curl -X GET https://your-domain.vercel.app/api/cron/daily-stats \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

- [ ] Verify each endpoint returns 200 and check Vercel function logs for expected output

### AI Integration

- [ ] AI analysis endpoint responds correctly (test via cron trigger or direct API call)
- [ ] GPT-4 responses are parsed and stored in `ai_analyses` table
- [ ] Weekly report generation produces valid content in `weekly_reports` table

### Notifications

- [ ] In-app notifications appear in the bell dropdown in real time (test by inserting a notification row)
- [ ] Email notifications deliver (if Resend is configured)
- [ ] Push notifications deliver (if VAPID keys are configured)
- [ ] Realtime subscription reconnects after network interruption

### Performance

- [ ] Dashboard loads in under 2 seconds (test with [PageSpeed Insights](https://pagespeed.web.dev))
- [ ] No significant layout shift during page load
- [ ] Lighthouse performance score >= 80

---

## 8. Monitoring & Maintenance

### Vercel Monitoring

- **Analytics**: Enable Vercel Analytics in **Project > Analytics** for Core Web Vitals tracking.
- **Speed Insights**: Enable Speed Insights for real-user performance data.
- **Function Logs**: Monitor serverless function executions in **Project > Logs**.
- **Deploy Notifications**: Configure Slack or email notifications for deploy status.

### Supabase Monitoring

- **Dashboard**: Monitor database connections, storage usage, and API requests in the Supabase dashboard.
- **Logs**: View Postgres logs in **Logs > Postgres** for slow queries or errors.
- **Database Health**: Monitor connection count and active queries in **Database > Roles**.
- **Storage Usage**: Monitor database size in **Settings > Database > Disk Usage**.

### OpenAI Monitoring

- **Usage Dashboard**: Monitor token usage and costs at [platform.openai.com/usage](https://platform.openai.com/usage).
- **Rate Limits**: Check your rate limit tier and current usage.
- **Set Budget Alerts**: Configure spending limits in OpenAI account settings to prevent unexpected costs.

### Routine Maintenance Tasks

| Task                              | Frequency   | How                                                       |
| --------------------------------- | ----------- | --------------------------------------------------------- |
| Review Vercel function logs       | Daily       | Check for errors or timeouts in Vercel dashboard          |
| Monitor OpenAI token usage        | Weekly      | Review usage dashboard, check costs                       |
| Check Supabase connection count   | Weekly      | Dashboard > Database > Active connections                 |
| Review database size              | Monthly     | Dashboard > Settings > Database                           |
| Update dependencies               | Monthly     | `npm outdated` then `npm update` with testing             |
| Rotate CRON_SECRET                | Quarterly   | Generate new secret, update in Vercel and vercel.json     |
| Review RLS policies               | Quarterly   | Audit policies match current data access patterns         |
| Test backup restoration           | Quarterly   | Download Supabase backup and restore to a test project    |

### Database Backups

**Supabase Pro Plan**: Automatic daily backups with 7-day retention. Point-in-time recovery available.

**Supabase Free Plan**: No automatic backups. Set up manual backups:

```bash
# Manual backup using pg_dump (requires direct database connection string)
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  --format=custom \
  --file=backup_$(date +%Y%m%d).dump
```

Schedule this via a local cron job or a CI/CD pipeline.

### Deploy Hooks

Set up a Vercel deploy hook for automated deployments:

1. Go to **Project > Settings > Git > Deploy Hooks**.
2. Create a hook for the main branch.
3. Use the webhook URL in your CI/CD pipeline to trigger deploys.

---

## 9. Troubleshooting

### Authentication Issues

| Symptom                                      | Cause                                              | Solution                                                       |
| -------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| "Invalid JWT" error                          | Mismatched Supabase keys                           | Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` matches the project's anon key in Supabase dashboard |
| OAuth redirects to wrong URL                 | Incorrect redirect URL configuration               | Update **Site URL** and **Redirect URLs** in Supabase Auth settings |
| "Email not confirmed" error                  | Email confirmation required but not completed       | Check spam folder, or disable email confirmation in Supabase Auth settings |
| OAuth login fails silently                   | Missing or incorrect OAuth client credentials       | Verify Client ID and Secret in Supabase Auth > Providers        |

### Database Issues

| Symptom                                      | Cause                                              | Solution                                                       |
| -------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| "Permission denied" or empty results         | RLS policy blocking access                         | Verify `auth.uid()` matches the `user_id` column; check policy logic in Supabase dashboard |
| "Relation does not exist"                    | Migrations not applied                             | Run `supabase db push` or manually apply migration SQL          |
| Slow queries (>1s)                           | Missing indexes                                    | Check query plan with `EXPLAIN ANALYZE`, add indexes as needed  |
| "Too many connections"                       | Connection pool exhausted                          | Enable PgBouncer in Supabase (Settings > Database > Connection pooling) |

### Deployment Issues

| Symptom                                      | Cause                                              | Solution                                                       |
| -------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| Build fails with TypeScript errors           | Type errors in code                                | Run `npx tsc --noEmit` locally to find and fix errors           |
| Build fails with "missing module"            | Missing dependency                                 | Run `npm install` locally, verify `package.json` is committed   |
| Build fails with "env var not found"         | Missing environment variable                       | Add the variable in Vercel > Settings > Environment Variables   |
| 500 error on page load                       | Server-side error in component                     | Check Vercel function logs for the error stack trace            |
| CORS error in browser console                | Supabase Site URL mismatch                         | Update Site URL in Supabase Auth > URL Configuration            |

### Cron Job Issues

| Symptom                                      | Cause                                              | Solution                                                       |
| -------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| Cron jobs not firing                         | `vercel.json` syntax error or plan limitation      | Validate JSON syntax; check Vercel plan supports the frequency  |
| Cron returns 401 Unauthorized                | Wrong or missing CRON_SECRET                       | Verify the secret matches between Vercel env vars and the code  |
| Cron times out (10s limit on Hobby)          | Processing takes too long                          | Optimize query, batch users, or upgrade to Pro (60s limit)      |
| Cron runs but no data changes                | Logic error in the handler                         | Add logging, check Vercel function logs, test locally           |

### AI / OpenAI Issues

| Symptom                                      | Cause                                              | Solution                                                       |
| -------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| "Incorrect API key" error                    | Invalid or revoked API key                         | Generate a new key at platform.openai.com and update env var    |
| "Rate limit exceeded"                        | Too many requests per minute                       | Implement exponential backoff; batch users in cron jobs         |
| "Model not found"                            | Account lacks GPT-4 access                         | Check OpenAI account tier; use `gpt-4o` or `gpt-4o-mini` if GPT-4 unavailable |
| Unexpectedly high costs                      | Too many tokens per request                        | Review prompts, reduce context window, set spending limits      |
| AI responses are poor quality                | Insufficient context in prompt                     | Include more study data in the prompt; add few-shot examples    |

---

## 10. Scaling Considerations

As your user base grows, consider these optimizations:

### Database (Supabase)

- **Connection Pooling**: Enable PgBouncer in Supabase settings for applications with >50 concurrent users. Use the pooling connection string (`port 6543`) instead of the direct connection string.
- **Indexes**: Add indexes on frequently queried columns:
  ```sql
  -- These should already exist from migrations, but verify:
  CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date ON study_sessions(user_id, started_at);
  CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON daily_stats(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
  CREATE INDEX IF NOT EXISTS idx_ai_analyses_user_date ON ai_analyses(user_id, created_at);
  ```
- **Read Replicas**: For read-heavy workloads (dashboard, visualizations), consider Supabase read replicas (available on Pro plan).
- **Partitioning**: If `study_sessions` grows beyond millions of rows, consider partitioning by date range.

### Compute (Vercel)

- **Edge Functions**: Move latency-sensitive, lightweight routes (e.g., notification count, session validation) to Vercel Edge Functions for lower latency.
- **Serverless Function Regions**: Configure the function region closest to your Supabase project to minimize latency:
  ```json
  // vercel.json
  {
    "regions": ["iad1"]
  }
  ```
- **ISR (Incremental Static Regeneration)**: For semi-static pages like the analysis report or leaderboard, use ISR with appropriate revalidation intervals.

### Caching

- **Vercel KV (Redis)**: Cache frequently accessed, infrequently changing data:
  - Dashboard summary data (cache for 5 minutes)
  - Leaderboard rankings (cache for 15 minutes)
  - User achievement list (invalidate on new achievement)
- **Next.js Data Cache**: Use Next.js `fetch` with `revalidate` for server-side data fetching:
  ```typescript
  const data = await fetch(url, { next: { revalidate: 300 } }); // 5-minute cache
  ```

### AI (OpenAI)

- **Batch Processing**: In the daily analysis cron, batch users rather than making one API call per user. Group 5-10 users per request where possible.
- **Model Selection**: Use `gpt-4o-mini` for routine analyses and reserve `gpt-4o` for weekly reports and complex risk assessments to reduce costs.
- **Prompt Optimization**: Keep prompts concise. Summarize study data before sending to the API instead of sending raw session records.
- **Response Caching**: Cache AI responses for identical inputs (e.g., same study pattern across multiple checks within a day).

### Monitoring at Scale

- **Error Tracking**: Integrate Sentry for real-time error tracking and alerting.
- **APM**: Use Vercel's built-in observability or integrate with Datadog for application performance monitoring.
- **Database Alerts**: Set up alerts in Supabase for high connection counts, slow queries, and storage thresholds.
- **Cost Alerts**: Set budget alerts on OpenAI and monitor Vercel usage to avoid surprise bills.

### Cost Estimation (Approximate)

| Users       | Supabase Plan | Vercel Plan | OpenAI Monthly Cost | Total Monthly   |
| ----------- | ------------- | ----------- | ------------------- | --------------- |
| 1-100       | Free          | Hobby       | $5-20               | ~$5-20          |
| 100-1,000   | Pro ($25)     | Pro ($20)   | $20-100             | ~$65-145        |
| 1,000-10,000| Pro ($25+)    | Pro ($20+)  | $100-500            | ~$145-545+      |

These are rough estimates. Actual costs depend on usage patterns, AI prompt sizes, and database query volume.

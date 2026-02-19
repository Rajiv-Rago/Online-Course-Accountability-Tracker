# Course Accountability Tracker

AI-powered course accountability tracker that analyzes learning patterns, predicts quit risk, and delivers personalized interventions.

## Stack

- **Frontend**: Next.js 14+ (App Router) + TypeScript
- **Backend**: Supabase (Postgres + Auth + Realtime)
- **AI**: OpenAI GPT-4
- **Hosting**: Vercel

## Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Fill in your Supabase and OpenAI credentials in .env.local

# Run development server
npm run dev
```

## Project Structure

See `docs/ARCHITECTURE.md` for the full system architecture and block design.

## Documentation

All specifications live in the `docs/` directory:

- `SPEC.md` - Complete product specification
- `ARCHITECTURE.md` - System architecture & block design
- `DATABASE.md` - Full schema, RLS policies, migrations
- `API_CONTRACTS.md` - All API routes & request/response shapes
- `blocks/B1-B8` - Individual block developer specs
- `INTEGRATION.md` - Integration phase guide
- `DEPLOYMENT.md` - Vercel + Supabase deployment guide

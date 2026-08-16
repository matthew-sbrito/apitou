# Apitou

Organize a pelada (Brazilian pickup soccer) from setup to súmula: persistent
teams, a live match clock, a "quem ganha fica" (winner-stays) queue, and a
final report — all built for one-handed use in the sun, at the edge of the
field.

The app itself is entirely in Brazilian Portuguese with football slang; this
README and the codebase are in English.

## Features

- **Events** — create a pelada, set team size/goalkeeper rules, edit details
  or mark it as started any time (independent of the scheduled time).
- **Players & teams** — roster with optional ratings, a balanced auto-draw
  (goalkeepers spread evenly, snake draft by rating), or build teams by hand.
- **Live match screen** — a derived clock (never drifts, survives a closed
  tab), one-tap goal/foul/card logging, temporary-suspension countdowns,
  injury/substitution flow, and score corrections that never delete history.
- **Queue engine** — replays finished matches through a pure "quem ganha
  fica" reducer to suggest the next matchup, with full manual override.
- **Súmula** — standings, top scorers, highlights (top scorer, longest
  reign, least-scored-against goalkeeper), and a shareable result image.
- **Match history** — every match, expandable to full rosters with
  goals/cards per player and an event-by-event timeline.
- **Offline-first** — match actions write straight from the browser and
  queue in IndexedDB when the network drops, syncing automatically.
- **Installable PWA** with light/dark-aware theming built entirely from a
  small set of brand color tokens.

Full product spec: [`docs/mvp/PLAN.md`](docs/mvp/PLAN.md). Architecture
notes, conventions, and gotchas for working in this codebase:
[`CLAUDE.md`](CLAUDE.md).

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind v4 · shadcn/ui
(`base-nova`, built on Base UI) · Supabase (Postgres + Auth) · Zustand ·
react-hook-form + zod · TanStack Query · idb-keyval · Vitest · Motion.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

You need your own Supabase project (the free tier works).

1. Copy the env template and fill in your project's URL and key — see the
   comments in the file for exactly where to find them in the Supabase
   dashboard:

   ```bash
   cp .env.example .env.local
   ```

2. Run the schema against your project: open
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   in the Supabase SQL Editor and execute it (or `supabase db push` if
   you're using the CLI). It creates every table, view, and RLS policy —
   nothing here has been applied to any project automatically.

### 3. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up with
email/password (Google sign-in is wired up but needs its own OAuth provider
configured in your Google Cloud + Supabase dashboards first).

## Scripts

```bash
npm run dev      # start the dev server (Turbopack)
npm run build    # production build
npm run start    # run the production build
npm run lint     # eslint
npm run test     # vitest — pure logic (draw/queue/clock engines)
```

## Project structure

```
app/(marketing)/    landing page
app/(auth)/          login, signup, oauth callback
app/(app)/events/    everything behind auth: dashboard, players, teams,
                     live match, match history, súmula, event editing
components/          shadcn primitives (ui/) + feature components
lib/                 pure logic — draw/queue/clock engines, offline queues,
                     validation schemas
supabase/migrations/ database schema
types/database.ts    hand-written types mirroring the schema
docs/mvp/PLAN.md     full product & architecture spec
```

See [`CLAUDE.md`](CLAUDE.md) for the reasoning behind non-obvious choices
(forms, offline sync, page transitions, Base UI quirks, and a few gotchas
worth knowing before touching this code).

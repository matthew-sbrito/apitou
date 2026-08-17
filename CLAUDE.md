@AGENTS.md

# Apitou

Organize a pelada (pickup soccer) from setup to súmula: persistent teams, a
live match clock, "quem ganha fica" (winner-stays) queue, and a final report.
Full spec lives in `docs/mvp/PLAN.md` — read it before making structural
changes, especially §3 "Decisões Arquiteturais" (non-negotiable) and §7/§9 for
the queue and pause/injury flows.

## Language convention

- **Code**: everything — identifiers, file/folder names, URL route segments,
  SQL, comments, commit messages — is **English**.
- **UI copy**: everything the user reads/hears is **Brazilian Portuguese**
  with football slang ("Apitar início", "Bola parada", "Apito final", "Banco",
  "Tirar time" — see `docs/mvp/PLAN.md` §12 for the full microcopy table).

Routes are English even though technically visible in the address bar:
`/events`, `/events/[id]/players`, `/events/[id]/teams`,
`/events/[id]/match/[matchId]`, `/events/[id]/matches`, `/events/[id]/summary`,
`/events/[id]/edit`, `/events/[id]/join`, `/login`, `/signup`.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind v4 · shadcn/ui
(`base-nova` style, built on **Base UI**, not Radix) · Supabase (Postgres +
Auth) · Zustand · react-hook-form + zod · TanStack Query · idb-keyval ·
Vitest · `motion` (Motion for React).

### Next.js 16 gotcha

Middleware was renamed **Proxy**. The root file is `proxy.ts`
(`export async function proxy(request)`), not `middleware.ts`. See
`node_modules/next/dist/docs/` for anything else that looks unfamiliar —
training data may be stale for this major version.

### Base UI, not Radix

shadcn's `base-nova` style wraps `@base-ui/react`. The polymorphic pattern is
different from the Radix `asChild` convention:

```tsx
// Radix (wrong here):
<Button asChild><Link href="/x">Go</Link></Button>

// Base UI (correct):
<Button render={<Link href="/x" />} nativeButton={false}>Go</Button>
```

`nativeButton={false}` is required whenever `render` targets a non-`<button>`
element (e.g. an anchor). Dialog/Select/Popover/Tabs follow the same
`render`-prop composition.

**Select shows the raw value instead of the label unless told otherwise.**
Unlike Radix, Base UI's `Select.Value` does not read the matching
`Select.Item`'s children to figure out what to display — it needs either an
`items` array shaped `{value, label}[]` passed to `Select.Root`, or (simpler,
what this codebase uses) a children render function on `SelectValue`:

```tsx
<SelectValue placeholder="Time">
  {(id: string | null) => teams.find((t) => t.id === id)?.name ?? "Time"}
</SelectValue>
```

Forgetting this compiles fine and looks right until you actually pick an
item — then the trigger shows the raw id/value instead of the label. Hit
(and fixed) in `TeamSelect` (`next-match-panel.tsx`) and the player/substitute
pickers in `pause-panel.tsx`; check any _new_ `Select` the same way.

## Forms

react-hook-form + `zodResolver`, not native `<form action={serverAction}>` +
`useActionState`. Two reasons this project settled here:

1. Passing a Server Action as `action` on a native form makes the browser
   reset uncontrolled fields once the action settles — including on a
   validation **error**, silently wiping what the user typed. RHF's
   `handleSubmit` intercepts the submit event, so this never happens.
2. Server Actions can be called as plain async functions from a Client
   Component (`await someAction(values)`); `redirect()` inside them still
   triggers client-side navigation correctly even when invoked this way, not
   just when wired through a `<form action>` prop.

Pattern used throughout (`app/(auth)/login/page.tsx` is the reference
example): `useForm<Input>({ resolver: zodResolver(schema) })` +
`<Controller>` per field, rendered with the shared `Field`/`FieldLabel`/
`FieldError` primitives from `components/ui/field.tsx`. The zod schemas in
`lib/validation/*.ts` avoid `z.coerce.*` — form values are already the right
type (number/boolean) via each field's `onChange`, and `z.coerce` would widen
the resolver's _input_ type to `unknown` and break `useForm<T>` inference.

Server Actions still re-validate with the same zod schema (`safeParse`) as
defense in depth, since they're callable directly, not just from the form.

`<form action={fn}>` is still used, deliberately, for actions with no client
validation step and no fields to preserve on error: `logout`, `loginWithGoogle`,
and bound row-actions like `setPlayerStatus.bind(null, eventId, playerId, status)`.

## Other UI patterns worth reusing

- **Date + time input**: `components/form/date-time-picker.tsx` — a Popover
  - Calendar for the date, and two themed `Select`s (00–23 / :00–:55 in
    5-min steps) for the time, not a native `<input type="time">`. The native
    picker's popup can't be restyled to match the app, and its 12h/24h format
    isn't reliably controllable across browsers; `Select` already inherits the
    app's color tokens for free. Controlled the way `<Controller>` expects:
    `value` is a combined ISO string (or `""`), `onChange` receives the new one.
- **Collapsible match history**: `app/(app)/events/[id]/matches/page.tsx`
  ("Partidas") lists every match as a `Collapsible` (`components/match/
match-accordion-item.tsx`) — closed row is just the score line, opening it
  shows duration, both full rosters (with per-player ⚽/🟨/🟥 counts), and an
  event timeline. All server-computed view models, zero client fetching.
- **Goal icon is the ⚽ emoji, not lucide's `Goal`**: used consistently in the
  live match `ActionBar`, `TeamCard`, `MatchAccordionItem`, the súmula
  highlight, and the landing mockup — don't reintroduce the lucide icon for
  goals, it reads worse next to the emoji already used everywhere else.
- **Create/edit sharing one form**: `components/form/event-form.tsx` takes
  `defaultValues` + an `onSubmit` matching both `createEvent` and
  `updateEvent`'s signature, used by `events/new/page.tsx` and
  `events/[id]/edit/edit-event-form.tsx`. `events.status` (`draft` →
  `running` → `finished`) gets set to `running` from two independent places:
  `startEvent` (manual "Dar início" button, for whenever the pelada actually
  starts vs. `scheduled_at`) and `startFirstMatch` (automatically, if the
  operator jumps straight to creating the first match without visiting the
  edit/dashboard page first).

## Event lifecycle: `finished` means read-only, everywhere

Once `events.status = 'finished'` (via `finishEvent`, the "Apito final"
button on the dashboard or in `NextMatchPanel`), every mutation surface for
that event switches to a read-only rendering instead of just disabling a
button — the goal is "nothing left to apitar, only the súmula to check":

- **Match screen** (`components/match/match-screen.tsx`): `MatchScreen`
  takes an `eventFinished` prop (set from the match page's own `events`
  query); when true it short-circuits to a locked banner + final score,
  before ever reaching the normal scheduled/running/paused/finished branches
  — no `ActionBar`, `PausePanel`, or `NextMatchPanel`.
- **Players / Teams pages**: each re-fetches `events.status` and swaps the
  add-forms, the `EditPlayerDialog`/remove-player controls, and `TeamCard`'s
  move/remove/add-player controls for a static "só pra consulta" message
  (`readOnly` prop threaded into `TeamCard`; the players page just omits the
  edit/remove controls inline based on the same check).
- **Edit page**: the form itself is replaced by a message instead of being
  merely disabled.
- **Server Actions**: `startFirstMatch` and `createNextMatch` re-check
  `events.status` server-side and refuse if `finished`, since the UI-level
  gating alone doesn't stop a direct call from a stale tab.

`app/(app)/events/[id]/matches` (read history) and `.../summary` stay fully
open in this state — those are the intended "what's left" destinations.

The dashboard's "next match" card used to filter matches to
`status in (running, paused, scheduled)` — once the _last_ match finished,
that query returned nothing and the operator had no path back to
`NextMatchPanel` (which only exists on a `finished` match's own page).
Fixed by dropping the status filter and just taking the latest match by
`sequence`, with the card's copy adapting ("Escolher próxima partida" instead
of "Voltar pra partida") based on that match's status.

## Navigation & page transitions

`app/(app)/events/[id]/layout.tsx` renders `EventNav` (the Visão geral /
Jogadores / Banco / Súmula tabs, with a `layoutId`-based sliding active pill)
and `{children}`. A sibling `app/(app)/events/[id]/template.tsx` wraps only
`{children}` in `components/providers/page-transition.tsx`'s fade/slide-in —
that split is deliberate: anything rendered by a `layout.tsx` (the app
header, `EventNav`) never re-animates on navigation, only the page content
inside the matching `template.tsx` does. `EventNav` also returns `null` on
`/match/*` routes — the match screen stays chrome-free on purpose (PLAN.md §1).

Next only remounts a `template.tsx` when _its own_ segment changes; a
template declared at the `[id]` level does **not** remount when navigating
between deeper sibling routes (`.../players` ↔ `.../teams`). That's why
`PageTransition` still keys its `motion.div` on `usePathname()` internally —
the template split controls _what_ animates, the `key` controls _when_.

If you add a page transition to a new route group, follow the same pattern
(layout for persistent chrome, sibling template scoped to `{children}` only)
rather than a single root-level template — an earlier version animated the
entire root layout (header included) on every navigation, which felt wrong
and was removed.

## Architecture (PLAN.md §3, don't relitigate)

- **Everything derives from events.** `match_events` is append-only; score,
  the queue, and standings are views/pure functions over that log, never a
  stored column.
- **The match clock is derived, never incremented.** `lib/clock.ts` computes
  `elapsed = accumulated_ms + (running ? serverNow - started_at : 0)`.
  `setInterval` only forces a re-render (see `hooks/use-match-clock.ts`).
- **The queue is derived**, not stored. `lib/queue-engine.ts` replays
  finished matches through a pure reducer — see `computeQueueState`.
- **Corrections never delete.** A `void` event points at the wrong one,
  followed by the correct event, at the same `clock_ms`.

## Event membership: owner + read-only members

Beyond the owner, other logged-in users can join an event as a read-only
**member** — the owner shares `.../events/[id]/join`; opening it while
logged in joins immediately (`supabase/migrations/0002_event_members.sql`,
`app/(app)/events/[id]/join/page.tsx`). No approval step yet — see
`docs/event-membership-approval.md` for that planned follow-up, including
the (non-breaking) migration path.

- **RLS is purely additive.** Every table already had an owner `for all`
  policy (`owns_event()`). Membership only adds new `for select` policies
  (`is_event_member()`) alongside them — Postgres OR's permissive policies
  for the same command, so none of the owner policies changed. `event_players`
  additionally gets narrow insert/delete policies scoped to `user_id =
auth.uid()`, letting a member add/remove _themselves_ from the roster
  without touching anyone else's row (`joinAsPlayer`/`leaveAsPlayer` in
  `app/(app)/events/[id]/players/actions.ts`) — this is what
  `event_players.user_id` (nullable, "null = walk-in player") was already
  for.
- **No membership row needed to know "is this viewer the owner."** Every
  page that needs this just fetches `event.owner_id` and compares to
  `supabase.auth.getUser()`'s id — if the `events` select returned a row at
  all, RLS already guarantees the viewer is the owner or a member, so
  there's no separate "am I a member" query. This is why `.../join` always
  upserts unconditionally (even for the owner re-visiting their own link)
  instead of checking ownership first: a brand-new joiner can't yet
  `select` the event to check, and a stray membership row for the owner is
  harmless since ownership checks never look at `event_members`.
- **`readOnly` now has two independent reasons**, both collapsing to the
  same hide-the-mutation-UI pattern: `!isOwner` (member) or `event.status
=== "finished"`. `components/match/match-screen.tsx`'s `readOnly` +
  `readOnlyReason` props are the reference — same locked banner, different
  copy depending on which reason applies. Apply both checks (`!isOwner ||
finished`) anywhere the finished-event lockdown already existed
  (dashboard, players, teams, edit, match screen).

## Hydration gotcha: `navigator` is not `undefined` on the server

Node 21+ ships a global `navigator` object (for `navigator.userAgent`) with
no `onLine` property. `typeof navigator === "undefined"` is therefore
**false** during SSR, so `navigator.onLine` silently reads as `undefined`
server-side while a real browser reads `true` — a classic hydration
mismatch, hit once already in `hooks/use-sync-status.ts`. Don't branch on
`navigator`/`window`-only values to compute initial render output; seed
`useState` with a fixed value instead and correct it from `useEffect` (see
that file, and `hooks/use-match-clock.ts` for the equivalent issue with
`Date.now()` — both work around the project's `react-hooks/set-state-in-effect`
and purity lint rules by deferring the correction to `requestAnimationFrame`
inside the effect rather than calling `setState` synchronously in the effect
body).

## Offline

The match screen writes directly from the browser (`lib/supabase/client.ts`),
never through a Server Action — Server Actions require a round trip, which
defeats offline-first. `lib/match-events.ts`'s `appendEvent` tries an upsert
(`on conflict (id) do nothing`, id generated client-side) and falls back to
`lib/offline/queue.ts` (IndexedDB) on failure. Matches-row patches
(status/accumulated_ms/started_at) get the same treatment via
`lib/offline/match-patch-queue.ts` (keyed by match id, last-write-wins — no
point replaying every intermediate pause/resume). `lib/offline/sync.ts` is a
backoff loop that flushes both queues; `hooks/use-sync-status.ts` +
`components/layout/sync-badge.tsx` surface it in the header.

## Brand

`app/globals.css` — the `:root` block right after the imports (`--apito-*`
custom properties) is the **only** place brand colors live; every semantic
token (`--primary`, `--background`, etc.) aliases those. Swap the hex values
there when a new logo/palette is ready and the whole app re-colors. The real
logo is `public/apitou-logo.png`, wrapped by `components/brand/logo.tsx`
(used in the header, auth layout, and marketing nav) — `app/icon.svg` and the
manifest icons are lighter fallbacks alongside it, not meant to be the primary
mark.

## Database

`supabase/migrations/0001_init.sql` is the full schema (tables, views, RLS) —
copy it into the Supabase SQL editor (or `supabase db push`) yourself; nothing
here has been run against a live project. `types/database.ts` is hand-written
to mirror it (no live project to run `supabase gen types` against) — keep the
two in sync when the schema changes. `event_team_players` and
`event_gk_stats` are additions beyond `PLAN.md` §4 verbatim, each with a
comment explaining the gap they close (persistent team roster before a team's
first match; goalkeeper goals-conceded for the súmula highlight).

**PostgREST embed ambiguity on `match_events`.** It has _two_ foreign keys
into `event_players` — `event_player_id` and `related_player_id` (assist/sub
partner). `.select("*, event_players(name)")` is therefore ambiguous:
PostgREST can't tell which FK to embed on and the query errors out. If you
don't check the `error` from that call (easy to forget — most queries here
just do `data ?? []`), it silently reads as "no rows", not a crash. Hit this
in the "Partidas" page, where it made every score read 0x0 despite goals
existing. Fix: disambiguate with the column hint,
`event_players!event_player_id(name)`. Any _new_ embedded select touching
`match_events` needs the same hint — grep for `from("match_events")` and
check before adding one.

## Running locally

```
cp .env.example .env.local   # fill in Supabase URL/keys — see comments in the file
npm run dev
npm run test                  # vitest, currently 24 tests across lib/*.test.ts
npm run lint
npm run build
```

Supabase's dashboard has been renaming "anon key" → "Publishable key" and
"service_role" → "Secret key" on newer projects; `.env.example` documents
both names.

## Known scope simplifications

Called out here so they're not mistaken for oversights:

- Goal assists are recorded in the data model but have no extra UI step
  (keeps the live "Gol" action a single tap — see PLAN.md §1 on why the match
  screen has to stay fast).
- Queue reordering in `components/match/next-match-panel.tsx` uses ↑/↓
  buttons, not drag-and-drop.
- Redrawing teams (`components/team/draw-dialog.tsx`) is disabled once the
  event's first match exists — enforced both in the UI (`matchesStarted`
  prop) and at the DB level (deleting `event_teams` referenced by a `matches`
  row fails the FK check).

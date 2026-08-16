-- Apitou — event membership.
-- Paste into the Supabase SQL Editor (or `supabase db push`) after
-- 0001_init.sql. Adds read-only "members" on top of the existing
-- owner-only model: the owner shares a join link (/events/[id]/join),
-- anyone logged in who opens it becomes a member immediately (no approval
-- step yet — see docs/event-membership-approval.md for that follow-up).
-- Every policy here is additive: it grants a new SELECT (or narrowly-scoped
-- insert/delete) alongside the existing owner `for all` policies from
-- 0001_init.sql, never replaces them — Postgres OR's permissive policies
-- for the same command together.

-- ─────────────────────────────────────────────
-- EVENT MEMBERS
-- ─────────────────────────────────────────────
create table event_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index on event_members (event_id);
create index on event_members (user_id);

alter table event_members enable row level security;

create or replace function is_event_member(e uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from event_members
    where event_id = e and user_id = auth.uid()
  );
$$;

-- Owner can see who joined; everyone manages only their own membership row.
create policy "owner reads members" on event_members
  for select using (owns_event(event_id));

create policy "self reads own membership" on event_members
  for select using (user_id = auth.uid());

create policy "self joins event" on event_members
  for insert with check (user_id = auth.uid());

create policy "self leaves event" on event_members
  for delete using (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- READ ACCESS FOR MEMBERS (owner's `for all` policies untouched)
-- ─────────────────────────────────────────────
create policy "members read events" on events
  for select using (is_event_member(id));

create policy "members read event players" on event_players
  for select using (is_event_member(event_id));

create policy "members read event teams" on event_teams
  for select using (is_event_member(event_id));

create policy "members read team rosters" on event_team_players
  for select using (
    is_event_member((select event_id from event_teams where id = event_team_id))
  );

create policy "members read matches" on matches
  for select using (is_event_member(event_id));

create policy "members read lineups" on match_lineups
  for select using (
    is_event_member((select event_id from matches where id = match_id))
  );

create policy "members read match events" on match_events
  for select using (
    is_event_member((select event_id from matches where id = match_id))
  );

-- ─────────────────────────────────────────────
-- SELF-SERVICE: a member can add/remove *themselves* as a player
-- (event_players.user_id was already nullable — "null = walk-in player" —
-- so this is just letting a member claim a row instead of only the owner
-- creating walk-in rows). No update policy: a member can join/leave the
-- roster, but editing rating/goalkeeper/status stays owner-only.
-- ─────────────────────────────────────────────
create policy "members add themselves as players" on event_players
  for insert with check (is_event_member(event_id) and user_id = auth.uid());

create policy "members remove themselves as players" on event_players
  for delete using (is_event_member(event_id) and user_id = auth.uid());

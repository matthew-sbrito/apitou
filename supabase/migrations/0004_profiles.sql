-- Apitou — user profiles.
-- Paste into the Supabase SQL Editor (or `supabase db push`) after
-- 0003_unique_player_name.sql. Stores a per-account custom display name and
-- default rating ("nota"), separate from auth.users.user_metadata.name (set
-- at signup) — this is what the header avatar and joinAsPlayer read from,
-- letting a player's name/rating pre-fill automatically whenever they join
-- a pelada, without touching every event_players row retroactively.
-- No row is created at signup — a profile only exists once the user saves
-- the /profile form (upsert), so every read needs a fallback for the
-- no-row-yet case (user_metadata.name, null rating).

create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  custom_name text,
  rating numeric(3,1) check (rating between 0 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "self reads own profile" on profiles
  for select using (user_id = auth.uid());

create policy "self upserts own profile" on profiles
  for insert with check (user_id = auth.uid());

create policy "self updates own profile" on profiles
  for update using (user_id = auth.uid());

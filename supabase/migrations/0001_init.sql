-- Apitou — initial schema.
-- Paste into the Supabase SQL Editor (or `supabase db push` if you use the CLI).
-- Mirrors docs/mvp/PLAN.md §4. Nothing here has been run against any project —
-- run it yourself against your own Supabase project.

-- ─────────────────────────────────────────────
-- EVENTS
-- ─────────────────────────────────────────────
create table events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  location text,
  scheduled_at timestamptz,
  team_size int not null default 5,          -- outfield players per team
  has_goalkeeper boolean not null default true,
  status text not null default 'draft'
    check (status in ('draft','running','finished')),
  paused_at timestamptz,                     -- whole event paused
  pause_reason text,
  rules jsonb not null default '{
    "drawRule": "defender_leaves",
    "maxReign": null,
    "matchDurationMs": null,
    "goalLimit": null
  }'::jsonb,
  created_at timestamptz not null default now()
);

create index on events (owner_id, created_at desc);

-- ─────────────────────────────────────────────
-- EVENT PLAYERS
-- ─────────────────────────────────────────────
create table event_players (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid references auth.users(id),    -- null = walk-in player
  name text not null,
  rating numeric(3,1) check (rating between 0 and 10),   -- optional
  is_goalkeeper boolean not null default false,
  is_substitute boolean not null default false,
  status text not null default 'active'
    check (status in ('active','injured','left')),
  status_note text,
  created_at timestamptz not null default now()
);

create index on event_players (event_id);

-- ─────────────────────────────────────────────
-- TEAMS (persist across the whole event)
-- ─────────────────────────────────────────────
create table event_teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,                        -- "Time 1", "Coletes"
  color text,                                -- hex, for the UI badge
  queue_position int not null,               -- INITIAL queue order
  created_at timestamptz not null default now(),
  unique (event_id, name),
  unique (event_id, queue_position)
);

create index on event_teams (event_id, queue_position);

-- ─────────────────────────────────────────────
-- TEAM ROSTERS
-- Not in PLAN.md §4.1 verbatim: match_lineups is inherently match-scoped
-- (§7.5 "escalação herdada" copies the lineup forward), so there needs to be
-- a persistent roster per event_team to seed a team's very first match and
-- to know who's on a team still sitting in the queue. A player can only
-- belong to one team per event.
-- ─────────────────────────────────────────────
create table event_team_players (
  id uuid primary key default gen_random_uuid(),
  event_team_id uuid not null references event_teams(id) on delete cascade,
  event_player_id uuid not null references event_players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_team_id, event_player_id),
  unique (event_player_id)
);

create index on event_team_players (event_team_id);

-- ─────────────────────────────────────────────
-- MATCHES
-- ─────────────────────────────────────────────
create table matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  sequence int not null,
  home_team_id uuid not null references event_teams(id),
  away_team_id uuid not null references event_teams(id),
  status text not null default 'scheduled'
    check (status in ('scheduled','running','paused','finished','cancelled')),
  started_at timestamptz,                    -- moment of the last "play"
  accumulated_ms bigint not null default 0,
  regulation_ms bigint,                      -- regulation time (optional)
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, sequence),
  constraint different_teams check (home_team_id <> away_team_id)
);

-- Concurrency lock: only ONE active match per event
create unique index one_active_match_per_event
  on matches (event_id)
  where status in ('running','paused');

create index on matches (event_id, sequence);

-- ─────────────────────────────────────────────
-- MATCH LINEUPS
-- ─────────────────────────────────────────────
create table match_lineups (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  event_team_id uuid not null references event_teams(id),
  event_player_id uuid not null references event_players(id),
  role text not null default 'line' check (role in ('line','gk')),
  unique (match_id, event_player_id)         -- can't be on both teams
);

create index on match_lineups (match_id, event_team_id);

-- ─────────────────────────────────────────────
-- MATCH EVENTS (append-only)
-- ─────────────────────────────────────────────
create table match_events (
  id uuid primary key,                       -- UUID GENERATED CLIENT-SIDE (idempotency)
  match_id uuid not null references matches(id) on delete cascade,
  event_team_id uuid references event_teams(id),
  event_player_id uuid references event_players(id),
  related_player_id uuid references event_players(id),  -- assist / sub
  type text not null check (type in (
    'goal','own_goal','penalty_goal','assist',
    'foul','yellow_card','red_card','blue_card','suspension',
    'sub_in','sub_out',
    'pause','resume','injury','void'
  )),
  clock_ms bigint not null,                  -- position on the clock, NOT wall-clock
  suspension_ms bigint,                      -- only for type='suspension'
  reason text check (reason in (
    'injury','substitution','correction','external','manual','halftime'
  )),
  voided_event_id uuid references match_events(id),
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index on match_events (match_id, clock_ms);
create index on match_events (match_id, type);
create index on match_events (voided_event_id) where voided_event_id is not null;

-- ─────────────────────────────────────────────
-- VIEWS (security_invoker so RLS from base tables applies)
-- ─────────────────────────────────────────────

-- Valid events (excludes voided ones)
create view valid_match_events with (security_invoker = on) as
select e.*
from match_events e
where not exists (
  select 1 from match_events v
  where v.voided_event_id = e.id
)
and e.type <> 'void';

-- Match score
create view match_scores with (security_invoker = on) as
select
  m.id as match_id,
  m.event_id,
  m.sequence,
  m.home_team_id,
  m.away_team_id,
  coalesce(count(*) filter (
    where e.type = 'goal' and e.event_team_id = m.home_team_id
  ), 0)
  + coalesce(count(*) filter (
    where e.type = 'own_goal' and e.event_team_id = m.away_team_id
  ), 0) as home_goals,
  coalesce(count(*) filter (
    where e.type = 'goal' and e.event_team_id = m.away_team_id
  ), 0)
  + coalesce(count(*) filter (
    where e.type = 'own_goal' and e.event_team_id = m.home_team_id
  ), 0) as away_goals,
  count(*) filter (
    where e.type = 'penalty_goal' and e.event_team_id = m.home_team_id
  ) as home_penalties,
  count(*) filter (
    where e.type = 'penalty_goal' and e.event_team_id = m.away_team_id
  ) as away_penalties,
  m.status
from matches m
left join valid_match_events e on e.match_id = m.id
group by m.id;

-- Match result
create view match_results with (security_invoker = on) as
select
  s.*,
  case
    when s.home_goals > s.away_goals then 'home'
    when s.away_goals > s.home_goals then 'away'
    when s.home_penalties > s.away_penalties then 'home'
    when s.away_penalties > s.home_penalties then 'away'
    else 'draw'
  end as result
from match_scores s;

-- Event standings
create view event_standings with (security_invoker = on) as
with team_matches as (
  select
    r.event_id,
    m.home_team_id as team_id,
    r.home_goals as gf,
    r.away_goals as ga,
    case r.result when 'home' then 'W' when 'away' then 'L' else 'D' end as outcome
  from match_results r
  join matches m on m.id = r.match_id
  where m.status = 'finished'
  union all
  select
    r.event_id,
    m.away_team_id,
    r.away_goals,
    r.home_goals,
    case r.result when 'away' then 'W' when 'home' then 'L' else 'D' end
  from match_results r
  join matches m on m.id = r.match_id
  where m.status = 'finished'
)
select
  t.event_id,
  t.id as team_id,
  t.name as team_name,
  t.color,
  count(tm.*) as played,
  count(*) filter (where tm.outcome = 'W') as wins,
  count(*) filter (where tm.outcome = 'D') as draws,
  count(*) filter (where tm.outcome = 'L') as losses,
  coalesce(sum(tm.gf), 0) as goals_for,
  coalesce(sum(tm.ga), 0) as goals_against,
  coalesce(sum(tm.gf) - sum(tm.ga), 0) as goal_diff,
  count(*) filter (where tm.outcome = 'W') * 3
    + count(*) filter (where tm.outcome = 'D') as points
from event_teams t
left join team_matches tm on tm.team_id = t.id
group by t.id
order by points desc, goal_diff desc, goals_for desc;

-- Event scorers
create view event_scorers with (security_invoker = on) as
select
  m.event_id,
  p.id as player_id,
  p.name as player_name,
  count(*) filter (where e.type = 'goal') as goals,
  count(*) filter (where e.type = 'assist') as assists,
  count(*) filter (where e.type = 'own_goal') as own_goals,
  count(*) filter (where e.type = 'yellow_card') as yellow_cards,
  count(*) filter (where e.type = 'red_card') as red_cards,
  count(*) filter (where e.type = 'foul') as fouls
from valid_match_events e
join matches m on m.id = e.match_id
join event_players p on p.id = e.event_player_id
group by m.event_id, p.id
order by goals desc, assists desc;

-- Goalkeeper stats (goals conceded while playing as 'gk'), for the
-- "goleiro menos vazado" highlight in the súmula — not in PLAN.md §4.3
-- verbatim, added to support §11.
create view event_gk_stats with (security_invoker = on) as
select
  m.event_id,
  l.event_player_id as player_id,
  p.name as player_name,
  count(distinct m.id) as matches_played,
  sum(
    case when l.event_team_id = m.home_team_id then s.away_goals
         else s.home_goals end
  ) as goals_against
from match_lineups l
join matches m on m.id = l.match_id
join match_scores s on s.match_id = m.id
join event_players p on p.id = l.event_player_id
where l.role = 'gk' and m.status = 'finished'
group by m.event_id, l.event_player_id, p.name;

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
alter table events              enable row level security;
alter table event_players       enable row level security;
alter table event_teams         enable row level security;
alter table event_team_players  enable row level security;
alter table matches             enable row level security;
alter table match_lineups       enable row level security;
alter table match_events        enable row level security;

create or replace function owns_event(e uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from events
    where id = e and owner_id = auth.uid()
  );
$$;

create policy "own events" on events
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "own event players" on event_players
  for all using (owns_event(event_id)) with check (owns_event(event_id));

create policy "own event teams" on event_teams
  for all using (owns_event(event_id)) with check (owns_event(event_id));

create policy "own team rosters" on event_team_players
  for all using (
    owns_event((select event_id from event_teams where id = event_team_id))
  ) with check (
    owns_event((select event_id from event_teams where id = event_team_id))
  );

create policy "own matches" on matches
  for all using (owns_event(event_id)) with check (owns_event(event_id));

create policy "own lineups" on match_lineups
  for all using (
    owns_event((select event_id from matches where id = match_id))
  ) with check (
    owns_event((select event_id from matches where id = match_id))
  );

create policy "own match events" on match_events
  for all using (
    owns_event((select event_id from matches where id = match_id))
  ) with check (
    owns_event((select event_id from matches where id = match_id))
  );

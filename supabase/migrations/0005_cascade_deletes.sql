-- Apitou — fix missing ON DELETE CASCADE on 0001_init.sql's foreign keys.
-- Paste into the Supabase SQL Editor (or `supabase db push`) after
-- 0004_profiles.sql.
--
-- event_team_players already cascaded on both its FKs, but matches,
-- match_lineups and match_events were left as the implicit NO ACTION
-- default. Deleting an event cascades to event_players/event_teams
-- directly (their own FK to events) *and* to matches (its own FK to
-- events) in the same statement — whichever side runs first, the NO
-- ACTION FK from matches/match_lineups/match_events back to
-- event_players/event_teams gets checked before the other branch has
-- cascaded that far, and the DELETE fails with a foreign key violation
-- (hit deleting an event that had matches: "Key is still referenced from
-- table match_lineups"). Since these rows are always deleted together —
-- nothing here outlives its event — cascade is the correct behavior, not
-- just a workaround.

alter table matches
  drop constraint matches_home_team_id_fkey,
  add constraint matches_home_team_id_fkey
    foreign key (home_team_id) references event_teams(id) on delete cascade;

alter table matches
  drop constraint matches_away_team_id_fkey,
  add constraint matches_away_team_id_fkey
    foreign key (away_team_id) references event_teams(id) on delete cascade;

alter table match_lineups
  drop constraint match_lineups_event_team_id_fkey,
  add constraint match_lineups_event_team_id_fkey
    foreign key (event_team_id) references event_teams(id) on delete cascade;

alter table match_lineups
  drop constraint match_lineups_event_player_id_fkey,
  add constraint match_lineups_event_player_id_fkey
    foreign key (event_player_id) references event_players(id) on delete cascade;

alter table match_events
  drop constraint match_events_event_team_id_fkey,
  add constraint match_events_event_team_id_fkey
    foreign key (event_team_id) references event_teams(id) on delete cascade;

alter table match_events
  drop constraint match_events_event_player_id_fkey,
  add constraint match_events_event_player_id_fkey
    foreign key (event_player_id) references event_players(id) on delete cascade;

alter table match_events
  drop constraint match_events_related_player_id_fkey,
  add constraint match_events_related_player_id_fkey
    foreign key (related_player_id) references event_players(id) on delete cascade;

alter table match_events
  drop constraint match_events_voided_event_id_fkey,
  add constraint match_events_voided_event_id_fkey
    foreign key (voided_event_id) references match_events(id) on delete cascade;

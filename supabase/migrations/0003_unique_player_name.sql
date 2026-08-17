-- ─────────────────────────────────────────────
-- No two players in the same event may share a name (case/whitespace
-- insensitive) — catches both the owner's manual add-player form and a
-- member's self-service joinAsPlayer. Case-insensitive on lower(trim(name))
-- so "João" / " joão " / "JOÃO" all collide instead of only exact matches.
-- ─────────────────────────────────────────────
create unique index event_players_event_id_name_key
  on event_players (event_id, lower(trim(name)));

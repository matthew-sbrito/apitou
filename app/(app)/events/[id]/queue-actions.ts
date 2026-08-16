"use server";

import { createClient } from "@/lib/supabase/server";
import type { EventPlayer } from "@/types/database";

/** Escalação herdada (PLAN.md §7.5): copies a team's most recent lineup
 * forward, falling back to the event's persistent roster the first time a
 * team takes the court. Injured/left players are dropped automatically. */
async function getTeamRosterForNextMatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  teamId: string,
) {
  type LineupRow = {
    event_player_id: string;
    role: "line" | "gk";
    event_players: Pick<EventPlayer, "status"> | null;
  };
  type LastMatchRow = { id: string; sequence: number; match_lineups: LineupRow[] };

  const { data } = await supabase
    .from("matches")
    .select("id, sequence, match_lineups(event_player_id, role, event_players(status))")
    .eq("event_id", eventId)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order("sequence", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastMatch = data as unknown as LastMatchRow | null;
  const priorLineup = lastMatch?.match_lineups ?? [];
  const relevantRows = priorLineup.filter(
    (row) => row.event_players?.status === "active",
  );

  if (relevantRows.length > 0) {
    return relevantRows.map((row) => ({
      event_player_id: row.event_player_id,
      role: row.role,
    }));
  }

  // Team has never played (or its whole prior lineup is unavailable now) —
  // fall back to the persistent roster from event_team_players.
  const { data: roster } = await supabase
    .from("event_team_players")
    .select("event_player_id, event_players(is_goalkeeper, status)")
    .eq("event_team_id", teamId);

  type RosterRow = {
    event_player_id: string;
    event_players: Pick<EventPlayer, "is_goalkeeper" | "status"> | null;
  };

  return ((roster ?? []) as unknown as RosterRow[])
    .filter((row) => row.event_players?.status === "active")
    .map((row) => ({
      event_player_id: row.event_player_id,
      role: (row.event_players?.is_goalkeeper ? "gk" : "line") as "gk" | "line",
    }));
}

export async function createNextMatch(
  eventId: string,
  homeTeamId: string,
  awayTeamId: string,
) {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("status")
    .eq("id", eventId)
    .single();

  if (event?.status === "finished") {
    return { error: "Esse evento já foi encerrado." };
  }

  const { data: lastMatch } = await supabase
    .from("matches")
    .select("sequence")
    .eq("event_id", eventId)
    .order("sequence", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sequence = (lastMatch?.sequence ?? 0) + 1;

  const { data: match, error } = await supabase
    .from("matches")
    .insert({
      event_id: eventId,
      sequence,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      status: "scheduled",
    })
    .select("id")
    .single();

  if (error || !match) {
    // The unique (event_id, sequence) index is the concurrency lock
    // (PLAN.md §7.3) — a collision here means another device already
    // created this match; nothing to do but let the operator retry.
    return { error: "Essa partida já foi criada em outro aparelho. Atualiza a tela." };
  }

  const [homeRoster, awayRoster] = await Promise.all([
    getTeamRosterForNextMatch(supabase, eventId, homeTeamId),
    getTeamRosterForNextMatch(supabase, eventId, awayTeamId),
  ]);

  const lineups = [
    ...homeRoster.map((r) => ({ ...r, event_team_id: homeTeamId })),
    ...awayRoster.map((r) => ({ ...r, event_team_id: awayTeamId })),
  ].map((r) => ({
    match_id: match.id,
    event_team_id: r.event_team_id,
    event_player_id: r.event_player_id,
    role: r.role,
  }));

  if (lineups.length > 0) {
    await supabase.from("match_lineups").insert(lineups);
  }

  return { matchId: match.id as string };
}

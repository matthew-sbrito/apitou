import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MatchScreen } from "@/components/match/match-screen";
import type { MatchStoreState } from "@/store/match-store";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  const { id: eventId, matchId } = await params;
  const supabase = await createClient();

  const [
    { data: match },
    { data: players },
    { data: lineups },
    { data: events },
    { data: event },
  ] = await Promise.all([
    supabase.from("matches").select("*").eq("id", matchId).single(),
    supabase.from("event_players").select("*").eq("event_id", eventId),
    supabase.from("match_lineups").select("*").eq("match_id", matchId),
    supabase
      .from("match_events")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true }),
    supabase.from("events").select("status").eq("id", eventId).single(),
  ]);

  if (!match) notFound();

  const [{ data: homeTeam }, { data: awayTeam }] = await Promise.all([
    supabase.from("event_teams").select("*").eq("id", match.home_team_id).single(),
    supabase.from("event_teams").select("*").eq("id", match.away_team_id).single(),
  ]);

  if (!homeTeam || !awayTeam) notFound();

  const allPlayers = players ?? [];
  const playersById = Object.fromEntries(allPlayers.map((p) => [p.id, p]));

  const initial: MatchStoreState = {
    match,
    events: events ?? [],
    homeTeam,
    awayTeam,
    lineups: lineups ?? [],
    players: playersById,
    allPlayers,
    clockOffset: 0,
  };

  return <MatchScreen initial={initial} eventFinished={event?.status === "finished"} />;
}

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
    { data: allTeams },
    { data: teamPlayers },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase.from("matches").select("*").eq("id", matchId).single(),
    supabase.from("event_players").select("*").eq("event_id", eventId),
    supabase.from("match_lineups").select("*").eq("match_id", matchId),
    supabase
      .from("match_events")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true }),
    supabase.from("events").select("status, owner_id").eq("id", eventId).single(),
    supabase.from("event_teams").select("*").eq("event_id", eventId),
    supabase
      .from("event_team_players")
      .select("event_player_id, event_team_id, event_teams!inner(event_id)")
      .eq("event_teams.event_id", eventId),
    supabase.auth.getUser(),
  ]);

  if (!match) notFound();

  const [{ data: homeTeam }, { data: awayTeam }] = await Promise.all([
    supabase.from("event_teams").select("*").eq("id", match.home_team_id).single(),
    supabase.from("event_teams").select("*").eq("id", match.away_team_id).single(),
  ]);

  if (!homeTeam || !awayTeam) notFound();

  const allPlayers = players ?? [];
  const playersById = Object.fromEntries(allPlayers.map((p) => [p.id, p]));
  const teamAssignmentRows = (teamPlayers ?? []) as unknown as {
    event_player_id: string;
    event_team_id: string;
  }[];
  const teamAssignments = Object.fromEntries(
    teamAssignmentRows.map((tp) => [tp.event_player_id, tp.event_team_id]),
  );

  const initial: MatchStoreState = {
    match,
    events: events ?? [],
    homeTeam,
    awayTeam,
    lineups: lineups ?? [],
    players: playersById,
    allPlayers,
    allTeams: allTeams ?? [],
    teamAssignments,
    clockOffset: 0,
  };

  const isOwner = user?.id === event?.owner_id;

  return (
    <MatchScreen
      initial={initial}
      readOnly={!isOwner || event?.status === "finished"}
      readOnlyReason={!isOwner ? "member" : "finished"}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { DrawDialog } from "@/components/team/draw-dialog";
import { TeamCard, type PlayerStat } from "@/components/team/team-card";
import { StartMatchButton } from "@/components/team/start-match-button";
import { AddTeamForm } from "./add-team-form";
import type { EventTeam } from "@/types/database";

type TeamWithRoster = EventTeam & {
  event_team_players: { event_player_id: string }[];
};

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  const [
    { data: event },
    { data: players },
    { data: teams },
    { count: matchCount },
    { data: scorers },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase.from("events").select("*").eq("id", eventId).single(),
    supabase
      .from("event_players")
      .select("*")
      .eq("event_id", eventId)
      .order("name", { ascending: true }),
    supabase
      .from("event_teams")
      .select("*, event_team_players(event_player_id)")
      .eq("event_id", eventId)
      .order("queue_position", { ascending: true }),
    supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId),
    supabase.from("event_scorers").select("*").eq("event_id", eventId),
    supabase.auth.getUser(),
  ]);

  if (!event) notFound();

  const isOwner = user?.id === event.owner_id;
  const readOnly = !isOwner || event.status === "finished";
  const allPlayers = players ?? [];
  const allTeams = (teams ?? []) as unknown as TeamWithRoster[];

  const stats: Record<string, PlayerStat> = {};
  for (const row of scorers ?? []) {
    stats[row.player_id] = {
      goals: row.goals,
      yellow_cards: row.yellow_cards,
      red_cards: row.red_cards,
    };
  }

  const rosterIdsByTeam = new Map(
    allTeams.map((team) => [
      team.id,
      new Set((team.event_team_players ?? []).map((r) => r.event_player_id)),
    ]),
  );

  const playerTeamName: Record<string, string> = {};
  for (const team of allTeams) {
    for (const playerId of rosterIdsByTeam.get(team.id) ?? []) {
      playerTeamName[playerId] = team.name;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold tracking-tight">Banco</h1>
        {!readOnly && (
          <DrawDialog
            eventId={eventId}
            players={allPlayers}
            teamSize={event.team_size}
            hasGoalkeeper={event.has_goalkeeper}
            matchesStarted={!!matchCount}
          />
        )}
      </div>

      {readOnly && (
        <p className="rounded-xl border border-white/10 bg-card px-4 py-3 text-sm text-muted-foreground">
          {!isOwner
            ? "Você tá vendo como convidado — banco de times só pra consulta."
            : "Evento encerrado — banco de times só pra consulta."}
        </p>
      )}

      {!readOnly && <AddTeamForm eventId={eventId} />}

      {allTeams.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum time ainda. Sorteia ou cria na mão.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {allTeams.map((team, index) => {
            const rosterIds = rosterIdsByTeam.get(team.id) ?? new Set<string>();
            return (
              <TeamCard
                key={team.id}
                eventId={eventId}
                team={team}
                roster={allPlayers.filter((p) => rosterIds.has(p.id))}
                otherPlayers={allPlayers.filter((p) => !rosterIds.has(p.id))}
                playerTeamName={playerTeamName}
                stats={stats}
                canMoveUp={index > 0}
                canMoveDown={index < allTeams.length - 1}
                readOnly={readOnly}
              />
            );
          })}
        </div>
      )}

      {!readOnly && allTeams.length >= 2 && !matchCount && (
        <StartMatchButton eventId={eventId} />
      )}
    </div>
  );
}

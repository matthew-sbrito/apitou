"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { teamSchema, type TeamInput } from "@/lib/validation/event";
import type { EventPlayer } from "@/types/database";

export type TeamFormState = { error: string } | undefined;

export type DrawnTeam = {
  name: string;
  color: string;
  playerIds: string[];
};

/** Replaces every team + roster for the event in one go — the "Tirar time" flow. */
export async function replaceTeams(eventId: string, teams: DrawnTeam[]) {
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("event_teams")
    .delete()
    .eq("event_id", eventId);

  if (deleteError) {
    return {
      error:
        "Não dá pra redesenhar os times com uma partida já rolando. Ajusta a escalação direto no time.",
    };
  }

  const { data: insertedTeams, error: insertError } = await supabase
    .from("event_teams")
    .insert(
      teams.map((team, index) => ({
        event_id: eventId,
        name: team.name,
        color: team.color,
        queue_position: index,
      })),
    )
    .select("id");

  if (insertError || !insertedTeams) {
    return { error: "Não rolou salvar os times. Tenta de novo." };
  }

  const roster = insertedTeams.flatMap((row, index) =>
    teams[index].playerIds.map((playerId) => ({
      event_team_id: row.id,
      event_player_id: playerId,
    })),
  );

  if (roster.length > 0) {
    const { error: rosterError } = await supabase
      .from("event_team_players")
      .insert(roster);

    if (rosterError) {
      return { error: "Times criados, mas a escalação não salvou. Ajusta na mão." };
    }
  }

  revalidatePath(`/events/${eventId}/teams`);
}

export async function addTeamManually(
  eventId: string,
  values: TeamInput,
): Promise<TeamFormState> {
  // Defense in depth — react-hook-form + zodResolver already validated
  // this client-side before calling here.
  const parsed = teamSchema.safeParse(values);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Confere os dados aí." };
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("event_teams")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  const { error } = await supabase.from("event_teams").insert({
    event_id: eventId,
    name: parsed.data.name,
    color: parsed.data.color || null,
    queue_position: count ?? 0,
  });

  if (error) {
    return { error: "Não rolou criar o time. Talvez já exista um com esse nome." };
  }

  revalidatePath(`/events/${eventId}/teams`);
}

export async function removeTeam(eventId: string, teamId: string) {
  const supabase = await createClient();
  await supabase.from("event_teams").delete().eq("id", teamId);
  revalidatePath(`/events/${eventId}/teams`);
}

export async function moveTeam(
  eventId: string,
  teamId: string,
  direction: "up" | "down",
) {
  const supabase = await createClient();
  const { data: teams } = await supabase
    .from("event_teams")
    .select("id, queue_position")
    .eq("event_id", eventId)
    .order("queue_position", { ascending: true });

  if (!teams) return;

  const index = teams.findIndex((t) => t.id === teamId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= teams.length) return;

  const a = teams[index];
  const b = teams[swapWith];

  // Bump `a` out of the way first — (event_id, queue_position) is unique.
  await supabase
    .from("event_teams")
    .update({ queue_position: -1 })
    .eq("id", a.id);
  await supabase
    .from("event_teams")
    .update({ queue_position: a.queue_position })
    .eq("id", b.id);
  await supabase
    .from("event_teams")
    .update({ queue_position: b.queue_position })
    .eq("id", a.id);

  revalidatePath(`/events/${eventId}/teams`);
}

/** Moves the given players onto `teamId`, pulling them off any other team. */
export async function setTeamRoster(
  eventId: string,
  teamId: string,
  playerIds: string[],
) {
  const supabase = await createClient();

  await supabase.from("event_team_players").delete().eq("event_team_id", teamId);
  if (playerIds.length > 0) {
    await supabase
      .from("event_team_players")
      .delete()
      .in("event_player_id", playerIds);

    await supabase.from("event_team_players").insert(
      playerIds.map((playerId) => ({
        event_team_id: teamId,
        event_player_id: playerId,
      })),
    );
  }

  revalidatePath(`/events/${eventId}/teams`);
}

type TeamWithRoster = {
  id: string;
  queue_position: number;
  event_team_players: Array<{
    event_player_id: string;
    event_players: Pick<EventPlayer, "is_goalkeeper" | "status"> | null;
  }>;
};

export async function startFirstMatch(eventId: string) {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("status")
    .eq("id", eventId)
    .single();

  if (event?.status === "finished") {
    return { error: "Esse evento já foi encerrado." };
  }

  const { data } = await supabase
    .from("event_teams")
    .select("id, queue_position, event_team_players(event_player_id, event_players(is_goalkeeper, status))")
    .eq("event_id", eventId)
    .order("queue_position", { ascending: true })
    .limit(2);

  const teams = data as unknown as TeamWithRoster[] | null;

  if (!teams || teams.length < 2) {
    return { error: "Precisa de pelo menos 2 times pra começar." };
  }

  const [home, away] = teams;

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .insert({
      event_id: eventId,
      sequence: 1,
      home_team_id: home.id,
      away_team_id: away.id,
      status: "scheduled",
    })
    .select("id")
    .single();

  if (matchError || !match) {
    return { error: "Não rolou criar a partida. Tenta de novo." };
  }

  const lineups = [home, away].flatMap((team) =>
    team.event_team_players
      .filter((row) => row.event_players?.status === "active")
      .map((row) => ({
        match_id: match.id,
        event_team_id: team.id,
        event_player_id: row.event_player_id,
        role: row.event_players?.is_goalkeeper ? "gk" : "line",
      })),
  );

  if (lineups.length > 0) {
    await supabase.from("match_lineups").insert(lineups);
  }

  await supabase.from("events").update({ status: "running" }).eq("id", eventId);

  return { matchId: match.id as string };
}

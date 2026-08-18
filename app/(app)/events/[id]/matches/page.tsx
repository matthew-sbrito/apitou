import { createClient } from "@/lib/supabase/server";
import { formatClock } from "@/lib/clock";
import { computeLiveScore } from "@/lib/live-score";
import { matchEventTypeLabel } from "@/lib/labels";
import {
  MatchAccordionItem,
  type MatchSummaryVM,
  type PlayerRow,
  type TimelineEntry,
} from "@/components/match/match-accordion-item";
import type { EventTeam, Match, MatchEvent } from "@/types/database";

type LineupRow = {
  match_id: string;
  event_team_id: string;
  event_player_id: string;
  event_players: { name: string; is_goalkeeper: boolean } | null;
};

type EventRow = MatchEvent & {
  event_players: { name: string } | null;
};

export default async function MatchesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const { teams, matches, teamPlayers, lineups, events } =
    await getData(eventId);

  const teamById = new Map((teams ?? []).map((t) => [t.id, t]));
  const assignedTeamOf = new Map(
    (
      (teamPlayers ?? []) as unknown as {
        event_player_id: string;
        event_team_id: string;
      }[]
    ).map((tp) => [tp.event_player_id, tp.event_team_id]),
  );

  const lineupsByMatch = groupBy((lineups ?? []) as unknown as LineupRow[], (l) => l.match_id);
  const eventsByMatch = groupBy((events ?? []) as unknown as EventRow[], (e) => e.match_id);

  const matchVMs: MatchSummaryVM[] = (matches ?? []).map((match) =>
    buildMatchVM(
      match,
      teamById,
      lineupsByMatch.get(match.id) ?? [],
      eventsByMatch.get(match.id) ?? [],
      assignedTeamOf,
    ),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">Partidas</h1>

      {matchVMs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma partida apitada ainda.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {matchVMs.map((match) => (
            <MatchAccordionItem key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}

async function getData(eventId: string) {
  const supabase = await createClient();

  const [{ data: teams }, { data: matches }, { data: teamPlayers }] = await Promise.all([
    supabase.from("event_teams").select("*").eq("event_id", eventId),
    supabase
      .from("matches")
      .select("*")
      .eq("event_id", eventId)
      .order("sequence", { ascending: true }),
    supabase
      .from("event_team_players")
      .select("event_player_id, event_team_id, event_teams!inner(event_id)")
      .eq("event_teams.event_id", eventId),
  ]);

  const matchIds = (matches ?? []).map((m) => m.id);

  const [{ data: lineups }, { data: events }] =
    matchIds.length > 0
      ? await Promise.all([
          supabase
            .from("match_lineups")
            .select("match_id, event_team_id, event_player_id, event_players(name, is_goalkeeper)")
            .in("match_id", matchIds),
          supabase
            .from("match_events")
            // match_events has *two* FKs into event_players (event_player_id
            // and related_player_id) — without the `!event_player_id` hint,
            // PostgREST can't tell which one to embed on and the whole
            // query errors out silently here (we weren't checking `error`),
            // so `events` came back empty and every score read as 0x0.
            .select("*, event_players!event_player_id(name)")
            .in("match_id", matchIds)
            .order("clock_ms", { ascending: true }),
        ])
      : [{ data: [] }, { data: [] }];

  return { teams, matches, teamPlayers, lineups, events };
}

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

function buildMatchVM(
  match: Match,
  teamById: Map<string, EventTeam>,
  lineups: LineupRow[],
  matchEvents: EventRow[],
  assignedTeamOf: Map<string, string>,
): MatchSummaryVM {
  const homeTeam = teamById.get(match.home_team_id);
  const awayTeam = teamById.get(match.away_team_id);

  const voidedIds = new Set(
    matchEvents.filter((e) => e.voided_event_id).map((e) => e.voided_event_id),
  );
  const valid = matchEvents.filter((e) => e.type !== "void" && !voidedIds.has(e.id));

  const { homeGoals, awayGoals } = computeLiveScore(matchEvents, match.home_team_id, match.away_team_id);

  const statsByPlayer = new Map<string, { goals: number; yellowCards: number; redCards: number }>();
  for (const e of valid) {
    if (!e.event_player_id) continue;
    const stat = statsByPlayer.get(e.event_player_id) ?? {
      goals: 0,
      yellowCards: 0,
      redCards: 0,
    };
    if (e.type === "goal" || e.type === "penalty_goal") stat.goals += 1;
    if (e.type === "yellow_card") stat.yellowCards += 1;
    if (e.type === "red_card") stat.redCards += 1;
    statsByPlayer.set(e.event_player_id, stat);
  }

  function roster(teamId: string): PlayerRow[] {
    return lineups
      .filter((l) => l.event_team_id === teamId && l.event_players)
      .map((l) => {
        const stat = statsByPlayer.get(l.event_player_id);
        const assignedTeam = assignedTeamOf.get(l.event_player_id);
        const loanFromTeamId =
          assignedTeam && assignedTeam !== teamId ? assignedTeam : null;
        return {
          id: l.event_player_id,
          name: l.event_players!.name,
          isGoalkeeper: l.event_players!.is_goalkeeper,
          goals: stat?.goals ?? 0,
          yellowCards: stat?.yellowCards ?? 0,
          redCards: stat?.redCards ?? 0,
          loanFromTeamName: loanFromTeamId
            ? (teamById.get(loanFromTeamId)?.name ?? "outro time")
            : undefined,
        };
      });
  }

  const timeline: TimelineEntry[] = valid
    .filter((e) => matchEventTypeLabel[e.type])
    .map((e) => ({
      id: e.id,
      clockLabel: formatClock(e.clock_ms),
      label: matchEventTypeLabel[e.type]!,
      playerName: e.event_players?.name ?? null,
      teamName:
        e.event_team_id === match.home_team_id
          ? (homeTeam?.name ?? null)
          : e.event_team_id === match.away_team_id
            ? (awayTeam?.name ?? null)
            : null,
    }));

  return {
    id: match.id,
    sequence: match.sequence,
    status: match.status,
    durationLabel: formatClock(match.accumulated_ms),
    homeTeam: {
      id: match.home_team_id,
      name: homeTeam?.name ?? "Time",
      color: homeTeam?.color ?? null,
    },
    awayTeam: {
      id: match.away_team_id,
      name: awayTeam?.name ?? "Time",
      color: awayTeam?.color ?? null,
    },
    homeGoals,
    awayGoals,
    homeRoster: roster(match.home_team_id),
    awayRoster: roster(match.away_team_id),
    timeline,
  };
}

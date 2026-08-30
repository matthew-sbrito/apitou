"use client";

import { createNextMatch } from "@/app/(app)/events/[id]/queue-actions";
import { swapQueuePositions } from "@/app/(app)/events/[id]/teams/actions";
import { FinishEventButton } from "@/components/event/finish-event-button";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { computeQueueState, type FinishedMatch } from "@/lib/queue-engine";
import { createClient } from "@/lib/supabase/client";
import type { EventTeam } from "@/types/database";
import { ArrowDown, ArrowUp, Shuffle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type RosterPlayer = { id: string; name: string; is_goalkeeper: boolean };
type TeamWithRoster = {
  id: string;
  event_team_players: Array<{ event_players: RosterPlayer | null }>;
};

export function NextMatchPanel({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [teams, setTeams] = useState<EventTeam[] | null>(null);
  const [rostersByTeam, setRostersByTeam] = useState<
    Record<string, RosterPlayer[]>
  >({});
  const [homeId, setHomeId] = useState<string | null>(null);
  const [awayId, setAwayId] = useState<string | null>(null);
  /** Full suggested order (on-court pair + bench) — the "Banco" list below
   * is always derived from this minus whichever teams are currently picked
   * as mandante/visitante, so it stays in sync as those selects change. */
  const [order, setOrder] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const [{ data: event }, { data: teamRows }, { data: results }, { data: rosterRows }] =
        await Promise.all([
          supabase.from("events").select("rules").eq("id", eventId).single(),
          supabase
            .from("event_teams")
            .select("*")
            .eq("event_id", eventId)
            .order("queue_position", { ascending: true }),
          supabase
            .from("match_results")
            .select("*")
            .eq("event_id", eventId)
            .eq("status", "finished"),
          supabase
            .from("event_teams")
            .select("id, event_team_players(event_players(id, name, is_goalkeeper))")
            .eq("event_id", eventId),
        ]);

      if (cancelled || !event || !teamRows) return;

      const finished: FinishedMatch[] = (results ?? []).map((r) => ({
        sequence: r.sequence,
        home: r.home_team_id,
        away: r.away_team_id,
        result: r.result,
      }));

      const state = computeQueueState(teamRows, finished, event.rules);

      const teamsWithRoster = rosterRows as unknown as TeamWithRoster[] | null;
      const rosters: Record<string, RosterPlayer[]> = {};
      for (const team of teamsWithRoster ?? []) {
        rosters[team.id] = team.event_team_players
          .map((row) => row.event_players)
          .filter((p): p is RosterPlayer => p != null);
      }

      setTeams(teamRows);
      setRostersByTeam(rosters);
      if (state.onCourt) {
        setHomeId(state.onCourt[0]);
        setAwayId(state.onCourt[1]);
      }
      setOrder([...(state.onCourt ?? []), ...state.queue]);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const benchOrder = useMemo(() => {
    // Defensive de-dupe on top of the exclusion filter — a team id should
    // never appear twice, but this keeps a stray duplicate from turning
    // into duplicate React keys (which silently scrambles the displayed
    // position numbers) instead of just being visibly wrong.
    const seen = new Set<string>();
    const result: string[] = [];
    for (const id of order) {
      if (id === homeId || id === awayId || seen.has(id)) continue;
      seen.add(id);
      result.push(id);
    }
    return result;
  }, [order, homeId, awayId]);

  function reorderLocal(teamId: string, direction: "up" | "down") {
    // Swap with the bench-adjacent neighbor (what's actually shown), not
    // whatever happens to sit next to it in `order` — the mandante/visitante
    // picks can put on-court teams between them in the full order.
    const swapWithId =
      benchOrder[benchOrder.indexOf(teamId) + (direction === "up" ? -1 : 1)];
    if (!swapWithId) return;

    setOrder((prev) => {
      const next = [...prev];
      const i = next.indexOf(teamId);
      const j = next.indexOf(swapWithId);
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    void swapQueuePositions(eventId, teamId, swapWithId);
  }

  const teamById = useMemo(
    () => Object.fromEntries((teams ?? []).map((t) => [t.id, t])),
    [teams],
  );

  async function confirm() {
    if (!homeId || !awayId || homeId === awayId) {
      setError("Escolhe dois times diferentes.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await createNextMatch(eventId, homeId, awayId);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push(`/events/${eventId}/match/${result.matchId}`);
  }

  if (!teams) {
    return (
      <p className="text-sm text-muted-foreground">Calculando a fila...</p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-apito-yellow/40 bg-apito-yellow/5 p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-apito-yellow">
          <Shuffle className="h-4 w-4" />
          Próxima partida sugerida
        </p>
        <div className="grid grid-cols-2 gap-3">
          <TeamSelect
            label="Mandante"
            teams={teams}
            value={homeId}
            onChange={setHomeId}
            roster={homeId ? rostersByTeam[homeId] : undefined}
            excludeId={awayId}
          />
          <TeamSelect
            label="Visitante"
            teams={teams}
            value={awayId}
            onChange={setAwayId}
            roster={awayId ? rostersByTeam[awayId] : undefined}
            excludeId={homeId}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          A sugestão é só um ponto de partida — troca à vontade.
        </p>
        {error && <p className="mt-2 text-sm text-apito-red">{error}</p>}
        <Button
          type="button"
          size="lg"
          className="mt-4 w-full"
          disabled={pending}
          onClick={confirm}
        >
          {pending ? "Apitando..." : "Apitar início"}
        </Button>
      </div>

      {benchOrder.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-muted-foreground">Banco</p>
          {benchOrder.map((teamId, index) => {
            const team = teamById[teamId];
            if (!team) return null;
            return (
              <div
                key={teamId}
                className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm"
              >
                <span>
                  {index + 1}. {team.name}
                </span>
                <div className="flex gap-1">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === 0}
                          onClick={() => reorderLocal(teamId, "up")}
                        />
                      }
                    >
                      <ArrowUp className="h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent>Subir na fila</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === benchOrder.length - 1}
                          onClick={() => reorderLocal(teamId, "down")}
                        />
                      }
                    >
                      <ArrowDown className="h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent>Descer na fila</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          className="flex-1"
          onClick={() => router.push(`/events/${eventId}`)}
        >
          Cancelar, volto depois
        </Button>
        <FinishEventButton eventId={eventId} className="flex-1" />
      </div>
    </div>
  );
}

function TeamSelect({
  label,
  teams,
  value,
  onChange,
  roster,
  excludeId,
}: {
  label: string;
  teams: EventTeam[];
  value: string | null;
  onChange: (id: string) => void;
  roster?: RosterPlayer[];
  /** Team already picked for the other side — hidden here so the same
   * team can't be selected for both mandante and visitante. */
  excludeId?: string | null;
}) {
  const options = excludeId ? teams.filter((t) => t.id !== excludeId) : teams;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Select
        value={value ?? undefined}
        onValueChange={(v) => {
          if (v) onChange(v);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Time">
            {(id: string | null) =>
              teams.find((t) => t.id === id)?.name ?? "Time"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {roster && roster.length > 0 && (
        <ul className="mt-1 flex flex-col gap-0.5 rounded-lg bg-background/60 p-2">
          {roster.map((p) => (
            <li key={p.id} className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="truncate">{p.name}</span>
              {p.is_goalkeeper && <span className="shrink-0 text-apito-yellow">GK</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

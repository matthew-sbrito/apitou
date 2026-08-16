"use client";

import { createNextMatch } from "@/app/(app)/events/[id]/queue-actions";
import { moveTeam } from "@/app/(app)/events/[id]/teams/actions";
import { finishEvent } from "@/app/(app)/events/actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { computeQueueState, type FinishedMatch } from "@/lib/queue-engine";
import { createClient } from "@/lib/supabase/client";
import type { EventTeam } from "@/types/database";
import { ArrowDown, ArrowUp, Shuffle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function NextMatchPanel({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [teams, setTeams] = useState<EventTeam[] | null>(null);
  const [homeId, setHomeId] = useState<string | null>(null);
  const [awayId, setAwayId] = useState<string | null>(null);
  const [queueOrder, setQueueOrder] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const [{ data: event }, { data: teamRows }, { data: results }] =
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
        ]);

      if (cancelled || !event || !teamRows) return;

      const finished: FinishedMatch[] = (results ?? []).map((r) => ({
        sequence: r.sequence,
        home: r.home_team_id,
        away: r.away_team_id,
        result: r.result,
      }));

      const state = computeQueueState(teamRows, finished, event.rules);

      setTeams(teamRows);
      if (state.onCourt) {
        setHomeId(state.onCourt[0]);
        setAwayId(state.onCourt[1]);
      }
      setQueueOrder(state.queue);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  function reorderLocal(teamId: string, direction: "up" | "down") {
    setQueueOrder((prev) => {
      const index = prev.indexOf(teamId);
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      return next;
    });
    void moveTeam(eventId, teamId, direction);
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
          />
          <TeamSelect
            label="Visitante"
            teams={teams}
            value={awayId}
            onChange={setAwayId}
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

      {queueOrder.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-muted-foreground">Banco</p>
          {queueOrder.map((teamId, index) => {
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === 0}
                    onClick={() => reorderLocal(teamId, "up")}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === queueOrder.length - 1}
                    onClick={() => reorderLocal(teamId, "down")}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
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
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => finishEvent(eventId)}
        >
          Apito final
        </Button>
      </div>
    </div>
  );
}

function TeamSelect({
  label,
  teams,
  value,
  onChange,
}: {
  label: string;
  teams: EventTeam[];
  value: string | null;
  onChange: (id: string) => void;
}) {
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
            {(id: string | null) => teams.find((t) => t.id === id)?.name ?? "Time"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {teams.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

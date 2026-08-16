"use client";

import {
  replaceTeams,
  type DrawnTeam,
} from "@/app/(app)/events/[id]/teams/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { drawTeams } from "@/lib/draw-engine";
import type { EventPlayer } from "@/types/database";
import { Shuffle } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

const TEAM_COLORS = [
  "#f5c400",
  "#dc2626",
  "#16a34a",
  "#2563eb",
  "#a855f7",
  "#f97316",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#fafafa",
];

export function DrawDialog({
  eventId,
  players,
  teamSize,
  hasGoalkeeper,
  matchesStarted = false,
}: {
  eventId: string;
  players: EventPlayer[];
  teamSize: number;
  hasGoalkeeper: boolean;
  /** Once the first match exists, teams are locked in — re-drawing would
   * orphan the lineups already tied to real matches. */
  matchesStarted?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [teamCount, setTeamCount] = useState(2);
  const [preview, setPreview] = useState<EventPlayer[][] | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const activePlayers = useMemo(
    () => players.filter((p) => p.status === "active" && !p.is_substitute),
    [players],
  );

  function draw() {
    setPreview(drawTeams(players, teamCount, teamSize, hasGoalkeeper));
  }

  function confirm() {
    if (!preview) return;
    setError(null);
    const teams: DrawnTeam[] = preview.map((team, i) => ({
      name: `Time ${i + 1}`,
      color: TEAM_COLORS[i % TEAM_COLORS.length],
      playerIds: team.map((p) => p.id),
    }));

    startTransition(async () => {
      const result = await replaceTeams(eventId, teams);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setPreview(null);
    });
  }

  if (matchesStarted) {
    return (
      <Button
        type="button"
        variant="secondary"
        disabled
        title="Já tem partida rolando — não dá mais pra redesenhar os times."
      >
        <Shuffle className="h-4 w-4" />
        Tirar times
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="secondary" />}>
        <Shuffle className="h-4 w-4" />
        Tirar times
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tirar time</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {activePlayers.length} jogador(es) ativo(s) disponível(is).
          </p>

          <div className="flex items-center gap-3">
            <Label htmlFor="teamCount" className="shrink-0">
              Quantos times
            </Label>
            <Input
              id="teamCount"
              type="number"
              min={2}
              max={6}
              value={teamCount}
              onChange={(e) => setTeamCount(Number(e.target.value) || 2)}
            />
          </div>

          <Button type="button" variant="outline" onClick={draw}>
            Sortear
          </Button>

          {preview && (
            <div className="flex flex-col gap-3">
              {preview.map((team, i) => (
                <div key={i} className="rounded-xl border border-white/10 p-3">
                  <p className="mb-1 text-sm font-semibold">Time {i + 1}</p>
                  <p className="text-sm text-muted-foreground">
                    {team.map((p) => p.name).join(", ") || "Ninguém"}
                  </p>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-apito-red">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            disabled={!preview || pending}
            onClick={confirm}
            className="w-full"
          >
            {pending ? "Salvando..." : "Confirmar times"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

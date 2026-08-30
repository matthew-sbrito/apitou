"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowRightLeft } from "lucide-react";
import { useMatchActions } from "@/hooks/use-match-actions";
import { RemovePlayerButton } from "@/components/match/remove-player-button";
import type { EventPlayer, EventTeam } from "@/types/database";

/** Moves any active player onto any event team, for good — a real
 * transfer of the persistent roster (`event_team_players`), not the old
 * "borrow for this match only" flow. Taking a player off their team
 * entirely is its own dedicated button (`RemovePlayerButton`); moving them
 * to another team confirms via the alert below. Both are permanent (not a
 * per-match loan). Shared by the scheduled (pre-kickoff), paused, and
 * running-without-pausing surfaces via `movePlayerToTeam`. */
export function TeamSwapSection({
  allPlayers,
  allTeams,
  teamAssignments,
  teamNameById,
}: {
  allPlayers: EventPlayer[];
  allTeams: EventTeam[];
  teamAssignments: Record<string, string>;
  teamNameById: Record<string, string>;
}) {
  const actions = useMatchActions();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [toTeamId, setToTeamId] = useState<string | null>(null);
  const [confirmingMove, setConfirmingMove] = useState(false);
  const [pending, setPending] = useState(false);

  const activePlayers = useMemo(
    () =>
      [...allPlayers]
        .filter((p) => p.status === "active")
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })),
    [allPlayers],
  );

  const player = playerId ? activePlayers.find((p) => p.id === playerId) : undefined;
  const currentTeamName = playerId && teamAssignments[playerId]
    ? teamNameById[teamAssignments[playerId]]
    : undefined;
  const targetTeamName = toTeamId ? teamNameById[toTeamId] : undefined;
  const hasTeam = !!currentTeamName;
  const destinationTeams = allTeams.filter(
    (t) => t.id !== (playerId ? teamAssignments[playerId] : undefined),
  );

  function reset() {
    setPlayerId(null);
    setToTeamId(null);
  }

  async function confirmMove() {
    if (!playerId || !toTeamId) return;
    setPending(true);
    await actions.movePlayerToTeam({ playerId, toTeamId });
    setPending(false);
    setConfirmingMove(false);
    reset();
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 p-4">
      <p className="flex items-center gap-2 font-semibold">
        <ArrowRightLeft className="h-4 w-4 text-apito-yellow" />
        Trocar ou tirar jogador de time
      </p>
      <p className="text-xs text-muted-foreground">
        Move o jogador pro time escolhido pra valer, ou tira ele do time
        atual — não é um empréstimo pra essa partida, é definitivo.
      </p>

      <Select
        value={playerId ?? undefined}
        onValueChange={(v) => {
          setPlayerId(v);
          setToTeamId(null);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Jogador">
            {(id: string | null) =>
              activePlayers.find((p) => p.id === id)?.name ?? "Jogador"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {activePlayers.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
              {teamAssignments[p.id]
                ? ` (${teamNameById[teamAssignments[p.id]] ?? "sem time"})`
                : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {playerId && (
        <div className="flex gap-2">
          <Select value={toTeamId ?? undefined} onValueChange={setToTeamId}>
            <SelectTrigger className="w-full flex-1">
              <SelectValue placeholder="Time de destino">
                {(id: string | null) =>
                  allTeams.find((t) => t.id === id)?.name ?? "Time de destino"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {destinationTeams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasTeam && (
            <RemovePlayerButton
              playerId={playerId}
              playerName={player?.name ?? "Esse jogador"}
              teamName={currentTeamName ?? "time atual"}
              onDone={reset}
            />
          )}
        </div>
      )}

      {playerId && toTeamId && (
        <Button type="button" size="sm" onClick={() => setConfirmingMove(true)}>
          Confirmar troca
        </Button>
      )}

      <AlertDialog
        open={confirmingMove}
        onOpenChange={(o) => !pending && setConfirmingMove(o)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trocar de time?</AlertDialogTitle>
            <AlertDialogDescription>
              {player?.name ?? "Esse jogador"} vai pro{" "}
              {targetTeamName ?? "time escolhido"} pra valer
              {currentTeamName ? `, saindo do ${currentTeamName}` : ""} —
              definitivo, não é só pra essa partida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={confirmMove}>
              {pending ? "Salvando..." : "Confirmar troca"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import {
  moveTeam,
  removeTeam,
  setTeamRoster,
} from "@/app/(app)/events/[id]/teams/actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EventPlayer, EventTeam } from "@/types/database";
import { ArrowDown, ArrowUp, Square, Trash2, UserPlus, X } from "lucide-react";
import { useTransition } from "react";

export type PlayerStat = {
  goals: number;
  yellow_cards: number;
  red_cards: number;
};

export function TeamCard({
  eventId,
  team,
  roster,
  otherPlayers,
  playerTeamName,
  stats,
  canMoveUp,
  canMoveDown,
  readOnly = false,
}: {
  eventId: string;
  team: EventTeam;
  /** Players currently on this team — the only ones rendered by default. */
  roster: EventPlayer[];
  /** Every event player NOT on this team, for the "add" picker. */
  otherPlayers: EventPlayer[];
  /** playerId -> name of the team they're currently on (if any), so picking
   * them here shows it's a move, not just an add. */
  playerTeamName: Record<string, string>;
  /** playerId -> goals/cards so far in the event. */
  stats: Record<string, PlayerStat>;
  canMoveUp: boolean;
  canMoveDown: boolean;
  readOnly?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const rosterIds = roster.map((p) => p.id);
  const sortedOtherPlayers = [...otherPlayers].sort((a, b) => {
    const teamCompare = (playerTeamName[a.id] ?? "").localeCompare(
      playerTeamName[b.id] ?? "",
      "pt-BR",
      { sensitivity: "base" },
    );
    return (
      teamCompare ||
      a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
    );
  });

  function addPlayer(playerId: string) {
    startTransition(() =>
      setTeamRoster(eventId, team.id, [...rosterIds, playerId]),
    );
  }

  function removePlayer(playerId: string) {
    startTransition(() =>
      setTeamRoster(
        eventId,
        team.id,
        rosterIds.filter((id) => id !== playerId),
      ),
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: team.color ?? "var(--apito-yellow)" }}
          />
          <p className="font-semibold">{team.name}</p>
          <span className="text-xs text-muted-foreground">
            {roster.length} jogador(es)
          </span>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!canMoveUp}
              onClick={() => moveTeam(eventId, team.id, "up")}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!canMoveDown}
              onClick={() => moveTeam(eventId, team.id, "down")}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeTeam(eventId, team.id)}
            >
              <Trash2 className="h-4 w-4 text-apito-red" />
            </Button>
          </div>
        )}
      </div>

      {roster.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {roster.map((player) => {
            const stat = stats[player.id];
            return (
              <li
                key={player.id}
                className="flex items-center justify-between rounded-lg bg-background/60 px-2.5 py-1.5 text-sm"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate">{player.name}</span>
                  {player.is_goalkeeper && (
                    <span className="shrink-0 text-xs text-apito-yellow">
                      GK
                    </span>
                  )}
                </span>

                <span className="flex shrink-0 items-center gap-3">
                  {!!stat?.goals && (
                    <div className="flex items-center gap-1">
                      <span className="text-base">⚽</span>
                      <span
                        className="text-xs text-muted-foreground"
                        title={`${stat.goals} gol(s)`}
                      >
                        {stat.goals}
                      </span>
                    </div>
                  )}
                  {!!stat?.yellow_cards && (
                    <span
                      className="flex items-center gap-0.5 text-xs text-muted-foreground"
                      title={`${stat.yellow_cards} cartão(ões) amarelo(s)`}
                    >
                      <Square className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {stat.yellow_cards}
                    </span>
                  )}
                  {!!stat?.red_cards && (
                    <span
                      className="flex items-center gap-0.5 text-xs text-muted-foreground"
                      title={`${stat.red_cards} cartão(ões) vermelho(s)`}
                    >
                      <Square className="h-3 w-3 fill-apito-red text-apito-red" />
                      {stat.red_cards}
                    </span>
                  )}
                  {!readOnly && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => removePlayer(player.id)}
                      className="text-muted-foreground hover:text-apito-red"
                      aria-label={`Tirar ${player.name} do time`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {!readOnly && otherPlayers.length > 0 && (
        <Select
          value={null}
          disabled={pending}
          onValueChange={(id) => id && addPlayer(id)}
        >
          <SelectTrigger className="mt-3 w-full">
            <UserPlus className="h-4 w-4 text-apito-yellow" />
            <SelectValue placeholder="Adicionar jogador" />
          </SelectTrigger>
          <SelectContent>
            {sortedOtherPlayers.map((player) => (
              <SelectItem key={player.id} value={player.id}>
                {player.name}
                {playerTeamName[player.id]
                  ? ` · ${playerTeamName[player.id]}`
                  : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

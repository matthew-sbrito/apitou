"use client";

import { moveTeam, removeTeam } from "@/app/(app)/events/[id]/teams/actions";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { EventPlayer, EventTeam } from "@/types/database";
import { ArrowDown, ArrowUp, Square, Trash2, UserPlus, X } from "lucide-react";

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
  pending = false,
  onAddPlayer,
  onRemovePlayer,
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
  /** Whether a roster mutation (add/remove) is in flight — disables the picker/remove buttons. */
  pending?: boolean;
  onAddPlayer: (playerId: string) => void;
  onRemovePlayer: (playerId: string) => void;
}) {
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
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={!canMoveUp}
                    onClick={() => moveTeam(eventId, team.id, "up")}
                  />
                }
              >
                <ArrowUp className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>Mover time pra cima</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={!canMoveDown}
                    onClick={() => moveTeam(eventId, team.id, "down")}
                  />
                }
              >
                <ArrowDown className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>Mover time pra baixo</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeTeam(eventId, team.id)}
                  />
                }
              >
                <Trash2 className="h-4 w-4 text-apito-red" />
              </TooltipTrigger>
              <TooltipContent>Remover time</TooltipContent>
            </Tooltip>
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
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => onRemovePlayer(player.id)}
                            className="text-muted-foreground hover:text-apito-red"
                            aria-label={`Tirar ${player.name} do time`}
                          />
                        }
                      >
                        <X className="h-4 w-4" />
                      </TooltipTrigger>
                      <TooltipContent>Tirar do time</TooltipContent>
                    </Tooltip>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {!readOnly && otherPlayers.length > 0 && (
        <Combobox<EventPlayer>
          key={sortedOtherPlayers.length}
          items={sortedOtherPlayers}
          itemToStringLabel={(player) => player.name}
          disabled={pending}
          onValueChange={(player) => player && onAddPlayer(player.id)}
        >
          <ComboboxInputGroup className="mt-3 w-full">
            <UserPlus className="h-4 w-4 text-apito-yellow" />
            <ComboboxInput placeholder="Adicionar jogador" />
            <ComboboxTrigger />
          </ComboboxInputGroup>
          <ComboboxContent>
            <ComboboxEmpty>Nenhum jogador encontrado.</ComboboxEmpty>
            <ComboboxList>
              {(player: EventPlayer) => (
                <ComboboxItem key={player.id} value={player}>
                  {player.name}
                  {playerTeamName[player.id]
                    ? ` · ${playerTeamName[player.id]}`
                    : ""}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      )}
    </div>
  );
}

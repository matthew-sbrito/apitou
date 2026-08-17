"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EventPlayer, EventTeam } from "@/types/database";
import { useState } from "react";

export type TeamRoster = { team: EventTeam; players: EventPlayer[] };

export function PlayerActionDialog({
  open,
  onOpenChange,
  title,
  rosters,
  extraOptions,
  confirmLabel = "Confirmar",
  /** When set, a "goal"-valued `extra` shows an optional, skippable
   * assist picker (teammates only, scorer excluded) after the scorer —
   * keeps the tap count at "one, plus an optional second" instead of
   * forcing a step on every goal (PLAN.md §1 wants the live "Gol" action fast). */
  assistExtraValue,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  rosters: TeamRoster[];
  extraOptions?: { value: string; label: string }[];
  confirmLabel?: string;
  assistExtraValue?: string;
  onConfirm: (opts: {
    teamId: string;
    playerId: string;
    extra?: string;
    assistPlayerId?: string;
  }) => Promise<unknown> | void;
}) {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [extra, setExtra] = useState<string | undefined>(
    extraOptions?.[0]?.value,
  );
  const [assistPlayerId, setAssistPlayerId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const roster = rosters.find((r) => r.team.id === teamId);
  const showAssistPicker =
    !!assistExtraValue && extra === assistExtraValue && !!playerId;

  function reset() {
    setTeamId(null);
    setPlayerId(null);
    setExtra(extraOptions?.[0]?.value);
    setAssistPlayerId(null);
  }

  async function confirm() {
    if (!teamId || !playerId) return;
    setPending(true);
    await onConfirm({
      teamId,
      playerId,
      extra,
      assistPlayerId:
        showAssistPicker && assistPlayerId ? assistPlayerId : undefined,
    });
    setPending(false);
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            {rosters.map(({ team }) => (
              <Button
                key={team.id}
                type="button"
                variant={teamId === team.id ? "default" : "outline"}
                onClick={() => {
                  setTeamId(team.id);
                  setPlayerId(null);
                  setAssistPlayerId(null);
                }}
              >
                {team.name}
              </Button>
            ))}
          </div>

          {roster && (
            <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto">
              {roster.players.map((player) => (
                <Button
                  key={player.id}
                  type="button"
                  size="sm"
                  variant={playerId === player.id ? "default" : "outline"}
                  onClick={() => {
                    setPlayerId(player.id);
                    setAssistPlayerId(null);
                  }}
                >
                  {player.name}
                </Button>
              ))}
              {roster.players.length === 0 && (
                <p className="col-span-2 text-sm text-muted-foreground">
                  Ninguém escalado nesse time.
                </p>
              )}
            </div>
          )}

          {extraOptions && (
            <Tabs value={extra} onValueChange={setExtra}>
              <TabsList className="w-full">
                {extraOptions.map((opt) => (
                  <TabsTrigger
                    key={opt.value}
                    value={opt.value}
                    className="flex-1"
                  >
                    {opt.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          {showAssistPicker && roster && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">
                Assistência (opcional)
              </p>
              <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto">
                <Button
                  type="button"
                  size="sm"
                  variant={assistPlayerId === null ? "default" : "outline"}
                  onClick={() => setAssistPlayerId(null)}
                >
                  Sem assistência
                </Button>
                {roster.players
                  .filter((player) => player.id !== playerId)
                  .map((player) => (
                    <Button
                      key={player.id}
                      type="button"
                      size="sm"
                      variant={
                        assistPlayerId === player.id ? "default" : "outline"
                      }
                      onClick={() => setAssistPlayerId(player.id)}
                    >
                      {player.name}
                    </Button>
                  ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            className="w-full"
            disabled={!teamId || !playerId || pending}
            onClick={confirm}
          >
            {pending ? "Registrando..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

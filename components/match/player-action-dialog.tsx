"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EventPlayer, EventTeam } from "@/types/database";

export type TeamRoster = { team: EventTeam; players: EventPlayer[] };

export function PlayerActionDialog({
  open,
  onOpenChange,
  title,
  rosters,
  extraOptions,
  confirmLabel = "Confirmar",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  rosters: TeamRoster[];
  extraOptions?: { value: string; label: string }[];
  confirmLabel?: string;
  onConfirm: (opts: { teamId: string; playerId: string; extra?: string }) => Promise<unknown> | void;
}) {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [extra, setExtra] = useState<string | undefined>(extraOptions?.[0]?.value);
  const [pending, setPending] = useState(false);

  const roster = rosters.find((r) => r.team.id === teamId);

  function reset() {
    setTeamId(null);
    setPlayerId(null);
    setExtra(extraOptions?.[0]?.value);
  }

  async function confirm() {
    if (!teamId || !playerId) return;
    setPending(true);
    await onConfirm({ teamId, playerId, extra });
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
                  onClick={() => setPlayerId(player.id)}
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
                  <TabsTrigger key={opt.value} value={opt.value} className="flex-1">
                    {opt.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
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

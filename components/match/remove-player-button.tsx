"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMatchActions } from "@/hooks/use-match-actions";
import { UserMinus } from "lucide-react";
import { useTransition } from "react";

/** Icon button that takes a player off their persistent team for good —
 * bundles its own confirm dialog the same self-contained way as
 * `CloneEventButton`, so callers just drop it in for the player/team it
 * affects instead of wiring up dialog state themselves. */
export function RemovePlayerButton({
  playerId,
  playerName,
  teamName,
  onDone,
}: {
  playerId: string;
  playerName: string;
  teamName: string;
  /** Called after the removal succeeds — e.g. to clear the caller's own
   * player/team selection. */
  onDone?: () => void;
}) {
  const actions = useMatchActions();
  const [pending, startTransition] = useTransition();

  function confirmRemove() {
    startTransition(async () => {
      await actions.movePlayerToTeam({ playerId, toTeamId: null });
      onDone?.();
    });
  }

  return (
    <AlertDialog>
      <Tooltip>
        <TooltipTrigger
          render={
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 text-apito-red"
                />
              }
            />
          }
        >
          <UserMinus className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent>Tirar do time</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tirar do time?</AlertDialogTitle>
          <AlertDialogDescription>
            {playerName} sai do {teamName} — definitivo, não é só pra essa
            partida.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={confirmRemove}
          >
            {pending ? "Tirando..." : "Tirar do time"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

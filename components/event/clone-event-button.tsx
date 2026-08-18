"use client";

import { cloneEvent } from "@/app/(app)/events/[id]/actions";
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
import { Copy } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

export function CloneEventButton({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition();

  function confirmClone() {
    startTransition(async () => {
      const result = await cloneEvent(eventId);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <AlertDialog>
      <Tooltip>
        <TooltipTrigger
          render={
            <AlertDialogTrigger
              render={<Button type="button" variant="ghost" size="icon" />}
            />
          }
        >
          <Copy className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent>Duplicar evento</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Duplicar esse evento?</AlertDialogTitle>
          <AlertDialogDescription>
            Isso cria uma nova pelada com as mesmas configurações e jogadores.
            Times e partidas não são copiados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={confirmClone}>
            {pending ? "Duplicando..." : "Duplicar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

"use client";

import { useTransition } from "react";
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
import { PlayCircle } from "lucide-react";
import Link from "next/link";
import { startEvent } from "@/app/(app)/events/[id]/actions";

export function StartEventButton({
  eventId,
  hasTeams,
}: {
  eventId: string;
  /** Whether teams have already been drawn for this event — if not, the
   * dialog suggests drawing them instead of starting right away. */
  hasTeams: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (!hasTeams) {
    return (
      <AlertDialog>
        <AlertDialogTrigger
          render={<Button type="button" variant="secondary" />}
        >
          <PlayCircle className="h-4 w-4" />
          Dar início na pelada
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ainda não tem time tirado</AlertDialogTitle>
            <AlertDialogDescription>
              Tira os times antes de começar a pelada, pra já sair rolando a
              primeira partida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              render={<Link href={`/events/${eventId}/teams`} />}
              nativeButton={false}
            >
              Tirar times
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button type="button" variant="secondary" />}>
        <PlayCircle className="h-4 w-4" />
        Dar início na pelada
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Começar a pelada?</AlertDialogTitle>
          <AlertDialogDescription>
            Marca o evento como rolando. Tem certeza que quer dar início
            agora?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() => startTransition(() => startEvent(eventId))}
          >
            {pending ? "Iniciando..." : "Dar início"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

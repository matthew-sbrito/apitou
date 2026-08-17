"use client";

import { finishEvent } from "@/app/(app)/events/actions";
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
import { Flag } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

export function FinishEventButton({
  eventId,
  activeMatchId = null,
  className,
}: {
  eventId: string;
  /** A match currently `running`/`paused`, if any — finishing the event is
   * blocked while one exists, so there's never a match stranded with
   * nobody able to act on it anymore. */
  activeMatchId?: string | null;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  async function confirmFinish() {
    startTransition(async () => {
      const result = await finishEvent(eventId);
      if (result?.error) toast.error(result.error);
    });
  }

  if (activeMatchId) {
    return (
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button type="button" variant="outline" className={className} />
          }
        >
          <Flag className="h-4 w-4" />
          Apito final
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem partida rolando!</AlertDialogTitle>
            <AlertDialogDescription>
              Não dá pra encerrar a pelada com uma partida em andamento — apita
              o fim dela primeiro (ou deixa rolando e volta aqui depois).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar rolando</AlertDialogCancel>
            <AlertDialogAction
              render={
                <Link href={`/events/${eventId}/match/${activeMatchId}`} />
              }
              nativeButton={false}
            >
              Finalizar partida
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button type="button" variant="outline" className={className} />
        }
      >
        <Flag className="h-4 w-4" />
        Apito final
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Encerrar a pelada?</AlertDialogTitle>
          <AlertDialogDescription>
            Marca o evento como encerrado e leva pra súmula. Depois disso não dá
            mais pra registrar partidas — só consultar o que já rolou.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={confirmFinish}>
            {pending ? "Encerrando..." : "Apito final"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

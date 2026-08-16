"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserPlus, LogOut } from "lucide-react";
import { joinAsPlayer, leaveAsPlayer } from "@/app/(app)/events/[id]/players/actions";

/** Self-service "participar da pelada" toggle for a member — distinct from
 * the owner's full player CRUD (add-player-form.tsx, the trash-icon row
 * actions), which stays owner-only. */
export function PlayerMembershipButton({
  eventId,
  myPlayerId,
}: {
  eventId: string;
  myPlayerId: string | null;
}) {
  const [pending, startTransition] = useTransition();

  if (myPlayerId) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(() => leaveAsPlayer(eventId, myPlayerId))
        }
      >
        <LogOut className="h-4 w-4" />
        {pending ? "Saindo..." : "Sair da lista de jogadores"}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await joinAsPlayer(eventId);
          if (result?.error) toast.error(result.error);
        })
      }
    >
      <UserPlus className="h-4 w-4" />
      {pending ? "Entrando..." : "Quero jogar! Participar da pelada"}
    </Button>
  );
}

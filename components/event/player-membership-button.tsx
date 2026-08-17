"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, LogOut } from "lucide-react";
import { joinAsPlayer, leaveAsPlayer } from "@/app/(app)/events/[id]/players/actions";

/** Self-service "participar da pelada" toggle for a member — distinct from
 * the owner's full player CRUD (add-player-form.tsx, the trash-icon row
 * actions), which stays owner-only. */
export function PlayerMembershipButton({
  eventId,
  myPlayerId,
  defaultName,
}: {
  eventId: string;
  myPlayerId: string | null;
  /** Seeds the name-conflict input below — the account's display name,
   * same fallback `joinAsPlayer` uses server-side. */
  defaultName: string;
}) {
  const [pending, startTransition] = useTransition();
  // Only entered on a 23505 conflict from joinAsPlayer — there's no form
  // here normally, so the name input only shows up once it's actually
  // needed to resolve a collision.
  const [nameConflict, setNameConflict] = useState(false);
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string | null>(null);

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

  function attemptJoin(overrideName?: string) {
    startTransition(async () => {
      const result = await joinAsPlayer(eventId, overrideName);
      if (result?.error) {
        if (result.field === "name") {
          setNameConflict(true);
          setError(result.error);
        } else {
          toast.error(result.error);
        }
        return;
      }
      setNameConflict(false);
      setError(null);
    });
  }

  if (nameConflict) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-apito-red">{error}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome nessa pelada"
            aria-invalid
          />
          <Button
            type="button"
            size="sm"
            disabled={pending || !name.trim()}
            onClick={() => attemptJoin(name)}
          >
            <UserPlus className="h-4 w-4" />
            {pending ? "Entrando..." : "Confirmar com esse nome"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      disabled={pending}
      onClick={() => attemptJoin()}
    >
      <UserPlus className="h-4 w-4" />
      {pending ? "Entrando..." : "Quero jogar! Participar da pelada"}
    </Button>
  );
}

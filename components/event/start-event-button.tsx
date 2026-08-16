"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { PlayCircle } from "lucide-react";
import { startEvent } from "@/app/(app)/events/[id]/actions";

export function StartEventButton({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      onClick={() => startTransition(() => startEvent(eventId))}
    >
      <PlayCircle className="h-4 w-4" />
      {pending ? "Iniciando..." : "Dar início na pelada"}
    </Button>
  );
}

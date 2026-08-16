"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { startFirstMatch } from "@/app/(app)/events/[id]/teams/actions";
import { PlayCircle } from "lucide-react";

export function StartMatchButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function start() {
    setError(null);
    startTransition(async () => {
      const result = await startFirstMatch(eventId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.matchId) {
        router.push(`/events/${eventId}/match/${result.matchId}`);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" size="lg" disabled={pending} onClick={start}>
        <PlayCircle className="h-5 w-5" />
        {pending ? "Apitando..." : "Apitar início"}
      </Button>
      {error && <p className="text-sm text-apito-red">{error}</p>}
    </div>
  );
}

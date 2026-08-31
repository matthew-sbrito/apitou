"use client";

import { startFirstMatch } from "@/app/(app)/events/[id]/teams/actions";
import { PlayCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/** Dashboard equivalent of components/team/start-match-button.tsx, styled as
 * a highlighted card (like the "Voltar pra partida" block below it) instead
 * of a standalone button — shown only while the event has no match yet. */
export function StartMatchCard({ eventId }: { eventId: string }) {
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
    <div className="flex flex-col gap-2 sm:col-span-2">
      <button
        type="button"
        disabled={pending}
        onClick={start}
        className="flex cursor-pointer items-center gap-3 rounded-2xl border border-apito-yellow/50 bg-apito-yellow/10 p-4 text-left transition hover:border-apito-yellow disabled:cursor-not-allowed disabled:opacity-60"
      >
        <PlayCircle className="h-5 w-5 text-apito-yellow" />
        <div>
          <p className="font-semibold">
            {pending ? "Apitando..." : "Apitar início"}
          </p>
          <p className="text-sm text-muted-foreground">
            Times prontos — falta só começar a primeira partida.
          </p>
        </div>
      </button>
      {error && <p className="text-sm text-apito-red">{error}</p>}
    </div>
  );
}

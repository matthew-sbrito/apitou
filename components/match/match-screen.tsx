"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MatchStoreProvider } from "@/components/match/match-store-provider";
import { useMatchStore } from "@/components/match/match-store-provider";
import { MatchClock } from "@/components/match/match-clock";
import { ScoreBoard } from "@/components/match/score-board";
import { ActionBar } from "@/components/match/action-bar";
import { PausePanel } from "@/components/match/pause-panel";
import { SuspensionList } from "@/components/match/suspension-list";
import { NextMatchPanel } from "@/components/match/next-match-panel";
import { Button } from "@/components/ui/button";
import { useMatchActions } from "@/hooks/use-match-actions";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { Lock, PlayCircle } from "lucide-react";
import type { MatchStoreState } from "@/store/match-store";

export function MatchScreen({
  initial,
  eventFinished = false,
}: {
  initial: MatchStoreState;
  eventFinished?: boolean;
}) {
  return (
    <MatchStoreProvider initial={initial}>
      <MatchScreenInner eventFinished={eventFinished} />
    </MatchStoreProvider>
  );
}

function MatchScreenInner({ eventFinished }: { eventFinished: boolean }) {
  const status = useMatchStore((s) => s.match.status);
  const eventId = useMatchStore((s) => s.match.event_id);
  const setClockOffset = useMatchStore((s) => s.setClockOffset);
  const actions = useMatchActions();
  useWakeLock(!eventFinished && status === "running");

  useEffect(() => {
    const requestedAt = Date.now();
    fetch("/api/time")
      .then((res) => res.json())
      .then(({ now }: { now: number }) => {
        // Rough one-way-latency correction: assume the request took as long
        // going as coming back, so the server's `now` landed at the midpoint.
        const latency = (Date.now() - requestedAt) / 2;
        setClockOffset(now + latency - Date.now());
      })
      .catch(() => {
        // No network yet — keep offset at 0 and trust the device clock
        // until a fetch succeeds.
      });
  }, [setClockOffset]);

  if (eventFinished) {
    return (
      <div className="flex flex-col gap-6">
        <ReadOnlyBanner />
        {(status === "running" || status === "paused") && <MatchClock />}
        <ScoreBoard />
        <Button render={<Link href={`/events/${eventId}/summary`} />} nativeButton={false}>
          Ver súmula
        </Button>
      </div>
    );
  }

  if (status === "scheduled") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-16">
        <ScoreBoard />
        <Button type="button" size="lg" onClick={() => actions.start()}>
          <PlayCircle className="h-5 w-5" />
          Apitar início
        </Button>
      </div>
    );
  }

  if (status === "finished") {
    return (
      <div className="flex flex-col gap-6">
        <ScoreBoard />
        <NextMatchPanel eventId={eventId} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <MatchClock />
      <ScoreBoard />
      {status === "running" && <SuspensionList />}
      {status === "running" && <ActionBar />}
      {status === "paused" && <PausePanel />}
    </div>
  );
}

function ReadOnlyBanner() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-card px-4 py-3 text-sm text-muted-foreground">
      <Lock className="h-4 w-4 shrink-0 text-apito-yellow" />
      Evento encerrado — essa partida ficou travada, só pra consulta.
    </div>
  );
}

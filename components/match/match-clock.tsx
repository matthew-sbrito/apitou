"use client";

import { useMatchStore } from "@/components/match/match-store-provider";
import { useMatchClock } from "@/hooks/use-match-clock";
import { formatClock, totalStoppageMs } from "@/lib/clock";
import { matchStatusLabel } from "@/lib/labels";

export function MatchClock() {
  const { elapsedMs, serverNowMs } = useMatchClock();
  const status = useMatchStore((s) => s.match.status);
  const events = useMatchStore((s) => s.events);

  const stoppage =
    status === "paused" ? totalStoppageMs(events, serverNowMs) : 0;

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="font-display text-7xl font-black tabular-nums tracking-tight text-apito-yellow drop-shadow-[0_0_24px_rgba(245,196,0,0.25)]">
        {formatClock(elapsedMs)}
      </p>
      <p className="text-sm text-muted-foreground">
        {matchStatusLabel[status]}
        {stoppage > 0 && ` · parado ${formatClock(stoppage)}`}
      </p>
    </div>
  );
}

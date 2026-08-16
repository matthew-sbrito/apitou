"use client";

import { useMatchClock } from "@/hooks/use-match-clock";
import { formatClock, totalStoppageMs } from "@/lib/clock";
import { matchStatusLabel } from "@/lib/labels";
import { useMatchStore } from "@/components/match/match-store-provider";

export function MatchClock() {
  const { elapsedMs } = useMatchClock();
  const status = useMatchStore((s) => s.match.status);
  const events = useMatchStore((s) => s.events);

  const stoppage = status === "paused" ? totalStoppageMs(events) : 0;

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-7xl font-black tabular-nums tracking-tight text-apito-yellow">
        {formatClock(elapsedMs)}
      </p>
      <p className="text-sm text-muted-foreground">
        {matchStatusLabel[status]}
        {stoppage > 0 && ` · parado ${formatClock(stoppage)}`}
      </p>
    </div>
  );
}

"use client";

import { useMatchStore } from "@/components/match/match-store-provider";
import { useMatchClock } from "@/hooks/use-match-clock";
import { formatClock, isSuspended, remainingSuspensionMs } from "@/lib/clock";
import { Badge } from "@/components/ui/badge";
import { Hourglass } from "lucide-react";

export function SuspensionList() {
  const events = useMatchStore((s) => s.events);
  const players = useMatchStore((s) => s.players);
  const { elapsedMs } = useMatchClock();

  const active = events
    .filter((e) => e.type === "suspension" && e.suspension_ms != null)
    .filter((e) => isSuspended(e, elapsedMs));

  if (active.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {active.map((e) => {
        const player = e.event_player_id ? players[e.event_player_id] : null;
        return (
          <Badge key={e.id} variant="outline" className="gap-1.5">
            <Hourglass className="h-3 w-3" />
            {player?.name ?? "Jogador"} · {formatClock(remainingSuspensionMs(e, elapsedMs))}
          </Badge>
        );
      })}
    </div>
  );
}

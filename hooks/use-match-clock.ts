"use client";

import { useEffect, useState } from "react";
import { computeElapsed } from "@/lib/clock";
import { useMatchStore } from "@/components/match/match-store-provider";

/** Ticks a re-render every 200ms while running — never a source of truth. */
export function useMatchClock() {
  const status = useMatchStore((s) => s.match.status);
  const startedAt = useMatchStore((s) => s.match.started_at);
  const accumulatedMs = useMatchStore((s) => s.match.accumulated_ms);
  const clockOffset = useMatchStore((s) => s.clockOffset);

  // `now` starts unset (no Date.now() call during render) and is only ever
  // written from inside the effect below, so rendering itself stays pure.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // Also ticks while paused: elapsedMs itself won't move, but the
    // "parado X:XX" stoppage readout (lib/clock.ts's totalStoppageMs) needs
    // fresh re-renders to keep counting up during an open pause.
    if (status !== "running" && status !== "paused") return;
    // Deferred to the next frame (not called synchronously in the effect
    // body) so the first tick lands almost immediately instead of waiting
    // out the first 200ms interval delay.
    const raf = requestAnimationFrame(() => setNow(Date.now()));
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, [status]);

  // Before the first effect tick, `now` is null — computeElapsed only reads
  // serverNowMs while running, and formatClock clamps negatives to 00:00, so
  // this is at most a harmless one-frame flash before the real value lands.
  const serverNowMs = (now ?? 0) + clockOffset;

  const elapsedMs = computeElapsed(
    { status, started_at: startedAt, accumulated_ms: accumulatedMs },
    serverNowMs,
  );

  return { elapsedMs, serverNowMs };
}

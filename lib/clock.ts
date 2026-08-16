import type { Match, MatchEvent } from "@/types/database";

/**
 * The match clock is always derived, never incremented by a timer
 * (PLAN.md §6.2) — `accumulated_ms` + time elapsed since `started_at` while
 * running is the only source of truth. `setInterval` may only trigger a
 * re-render, never write to this value directly.
 */
export function computeElapsed(
  match: Pick<Match, "status" | "accumulated_ms" | "started_at">,
  serverNowMs: number,
): number {
  if (match.status === "running" && match.started_at) {
    return match.accumulated_ms + (serverNowMs - new Date(match.started_at).getTime());
  }
  return match.accumulated_ms;
}

type SuspensionEvent = Pick<MatchEvent, "clock_ms" | "suspension_ms">;

export function isSuspended(suspension: SuspensionEvent, elapsedMs: number): boolean {
  const suspensionMs = suspension.suspension_ms ?? 0;
  return elapsedMs < suspension.clock_ms + suspensionMs;
}

export function remainingSuspensionMs(
  suspension: SuspensionEvent,
  elapsedMs: number,
): number {
  const suspensionMs = suspension.suspension_ms ?? 0;
  return Math.max(0, suspension.clock_ms + suspensionMs - elapsedMs);
}

type StoppageEvent = Pick<MatchEvent, "type" | "created_at">;

/**
 * Sums the wall-clock gaps between each 'pause' and the following 'resume'
 * (PLAN.md §6.4) — shown in the UI as "04:32 · parado 1:15" while paused.
 * If the match is currently paused, the open interval counts up to `nowMs`.
 */
export function totalStoppageMs(events: StoppageEvent[], nowMs: number = Date.now()): number {
  const sorted = events
    .filter((e) => e.type === "pause" || e.type === "resume")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  let total = 0;
  let pausedAt: number | null = null;

  for (const e of sorted) {
    const at = new Date(e.created_at).getTime();
    if (e.type === "pause") pausedAt = at;
    if (e.type === "resume" && pausedAt !== null) {
      total += at - pausedAt;
      pausedAt = null;
    }
  }

  if (pausedAt !== null) total += nowMs - pausedAt;
  return total;
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

import { describe, expect, it } from "vitest";
import {
  computeElapsed,
  isSuspended,
  remainingSuspensionMs,
  totalStoppageMs,
} from "./clock";

const T0 = Date.parse("2026-01-01T12:00:00.000Z");

describe("computeElapsed", () => {
  it("adds time since started_at while running", () => {
    const elapsed = computeElapsed(
      {
        status: "running",
        accumulated_ms: 60_000,
        started_at: new Date(T0).toISOString(),
      },
      T0 + 30_000,
    );
    expect(elapsed).toBe(90_000);
  });

  it("returns just accumulated_ms while paused", () => {
    const elapsed = computeElapsed(
      { status: "paused", accumulated_ms: 90_000, started_at: null },
      T0 + 999_999,
    );
    expect(elapsed).toBe(90_000);
  });

  it("returns the frozen accumulated_ms once finished", () => {
    const elapsed = computeElapsed(
      { status: "finished", accumulated_ms: 600_000, started_at: null },
      T0 + 1_000_000,
    );
    expect(elapsed).toBe(600_000);
  });

  it("accumulates correctly across play → pause → play → pause", () => {
    // Play at T0, pause 5 min later (accumulated_ms = 300_000, started_at = null).
    let match: { status: "paused" | "running"; accumulated_ms: number; started_at: string | null } = {
      status: "paused",
      accumulated_ms: 300_000,
      started_at: null,
    };
    expect(computeElapsed(match, T0 + 999_999)).toBe(300_000);

    // Play again at T0 + 10min.
    const secondPlayAt = T0 + 600_000;
    match = { status: "running", accumulated_ms: 300_000, started_at: new Date(secondPlayAt).toISOString() };
    // 3 more minutes elapse, then pause.
    const secondPauseAt = secondPlayAt + 180_000;
    expect(computeElapsed(match, secondPauseAt)).toBe(480_000);

    match = { status: "paused", accumulated_ms: 480_000, started_at: null };
    expect(computeElapsed(match, secondPauseAt + 999_999)).toBe(480_000);
  });
});

describe("totalStoppageMs", () => {
  it("sums closed pause → resume intervals", () => {
    const events = [
      { type: "pause" as const, created_at: new Date(T0).toISOString() },
      { type: "resume" as const, created_at: new Date(T0 + 60_000).toISOString() },
      { type: "pause" as const, created_at: new Date(T0 + 120_000).toISOString() },
      { type: "resume" as const, created_at: new Date(T0 + 150_000).toISOString() },
    ];
    expect(totalStoppageMs(events, T0 + 200_000)).toBe(60_000 + 30_000);
  });

  it("counts an open pause up to now", () => {
    const events = [
      { type: "pause" as const, created_at: new Date(T0).toISOString() },
    ];
    expect(totalStoppageMs(events, T0 + 45_000)).toBe(45_000);
  });
});

describe("suspension", () => {
  it("is active until clock_ms + suspension_ms is reached", () => {
    const suspension = { clock_ms: 100_000, suspension_ms: 120_000 };
    expect(isSuspended(suspension, 150_000)).toBe(true);
    expect(isSuspended(suspension, 219_999)).toBe(true);
    expect(isSuspended(suspension, 220_000)).toBe(false);
    expect(remainingSuspensionMs(suspension, 150_000)).toBe(70_000);
    expect(remainingSuspensionMs(suspension, 300_000)).toBe(0);
  });

  it("freezes while the match is paused, because elapsed itself freezes", () => {
    const suspension = { clock_ms: 100_000, suspension_ms: 60_000 };
    // Match paused at elapsed = 130_000 — suspension has 30s left.
    const pausedMatch = {
      status: "paused" as const,
      accumulated_ms: 130_000,
      started_at: null as string | null,
    };
    const elapsedNow = computeElapsed(pausedMatch, T0 + 999_999);
    const elapsedMuchLater = computeElapsed(pausedMatch, T0 + 9_999_999);

    expect(elapsedNow).toBe(elapsedMuchLater);
    expect(remainingSuspensionMs(suspension, elapsedNow)).toBe(
      remainingSuspensionMs(suspension, elapsedMuchLater),
    );
    expect(remainingSuspensionMs(suspension, elapsedNow)).toBe(30_000);
  });
});

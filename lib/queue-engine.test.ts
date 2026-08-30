import { describe, expect, it } from "vitest";
import { applyResult, computeQueueState, type FinishedMatch, type QueueState } from "./queue-engine";
import type { EventRules } from "@/types/database";

const baseRules: EventRules = {
  drawRule: "defender_leaves",
  maxReign: null,
  matchDurationMs: null,
  goalLimit: null,
};

function emptyState(teamIds: string[]): QueueState {
  return {
    onCourt: null,
    queue: [],
    reign: Object.fromEntries(teamIds.map((id) => [id, 0])),
    maxReign: Object.fromEntries(teamIds.map((id) => [id, 0])),
  };
}

describe("applyResult", () => {
  it("keeps the home winner on court and sends the loser to the back", () => {
    const state = emptyState(["A", "B", "C"]);
    state.onCourt = ["A", "B"];
    state.queue = ["C"];

    const next = applyResult(state, { sequence: 1, home: "A", away: "B", result: "home" }, baseRules);

    expect(next.onCourt).toEqual(["A", "C"]);
    expect(next.queue).toEqual(["B"]);
    expect(next.reign.A).toBe(1);
    expect(next.reign.B).toBe(0);
  });

  it("keeps the away winner on court", () => {
    const state = emptyState(["A", "B", "C"]);
    state.onCourt = ["A", "B"];
    state.queue = ["C"];

    const next = applyResult(state, { sequence: 1, home: "A", away: "B", result: "away" }, baseRules);

    expect(next.onCourt).toEqual(["B", "C"]);
    expect(next.queue).toEqual(["A"]);
  });

  describe("draw rules", () => {
    function drawState() {
      const state = emptyState(["A", "B", "C"]);
      state.onCourt = ["A", "B"];
      state.queue = ["C"];
      state.reign = { A: 2, B: 0, C: 0 }; // A is the defender (longer reign)
      return state;
    }

    it("both_leave: both teams go to the back", () => {
      const next = applyResult(
        drawState(),
        { sequence: 1, home: "A", away: "B", result: "draw" },
        { ...baseRules, drawRule: "both_leave" },
      );
      expect(next.onCourt).toEqual(["C", "A"]);
      expect(next.queue).toEqual(["B"]);
    });

    it("defender_leaves: the longer-reigning team (A) leaves", () => {
      const next = applyResult(
        drawState(),
        { sequence: 1, home: "A", away: "B", result: "draw" },
        { ...baseRules, drawRule: "defender_leaves" },
      );
      expect(next.onCourt).toEqual(["B", "C"]);
      expect(next.queue).toEqual(["A"]);
    });

    it("challenger_leaves: the newer team (B) leaves", () => {
      const next = applyResult(
        drawState(),
        { sequence: 1, home: "A", away: "B", result: "draw" },
        { ...baseRules, drawRule: "challenger_leaves" },
      );
      expect(next.onCourt).toEqual(["A", "C"]);
      expect(next.queue).toEqual(["B"]);
    });

    it("penalties: falls back to both leaving so the queue never stalls", () => {
      const next = applyResult(
        drawState(),
        { sequence: 1, home: "A", away: "B", result: "draw" },
        { ...baseRules, drawRule: "penalties" },
      );
      expect(next.onCourt).toEqual(["C", "A"]);
      expect(next.queue).toEqual(["B"]);
    });
  });

  it("sends a team to the back once it hits maxReign, even on a win", () => {
    const state = emptyState(["A", "B", "C"]);
    state.onCourt = ["A", "B"];
    state.queue = ["C"];
    state.reign = { A: 1, B: 0, C: 0 };

    const next = applyResult(
      state,
      { sequence: 1, home: "A", away: "B", result: "home" },
      { ...baseRules, maxReign: 2 },
    );

    // A's reign hits 2 (the cap), so it leaves despite winning — B (the
    // loser) and A (capped) both queue up behind C, which was already there.
    expect(next.onCourt).toEqual(["C", "B"]);
    expect(next.queue).toEqual(["A"]);
    expect(next.reign.A).toBe(0);
    expect(next.maxReign.A).toBe(2);
  });

  it("keeps just two teams alternating forever when there's no third team", () => {
    let state = emptyState(["A", "B"]);
    state.onCourt = ["A", "B"];

    const matches: FinishedMatch[] = [
      { sequence: 1, home: "A", away: "B", result: "home" },
      { sequence: 2, home: "A", away: "B", result: "away" },
      { sequence: 3, home: "A", away: "B", result: "home" },
    ];

    for (const m of matches) {
      state = applyResult(state, m, baseRules);
      expect(state.onCourt).not.toBeNull();
      expect(state.queue).toEqual([]);
    }
  });
});

describe("computeQueueState", () => {
  const teams = [
    { id: "A", queue_position: 0 },
    { id: "B", queue_position: 1 },
    { id: "C", queue_position: 2 },
    { id: "D", queue_position: 3 },
  ];

  it("starts the first two teams by queue_position on court", () => {
    const state = computeQueueState(teams, [], baseRules);
    expect(state.onCourt).toEqual(["A", "B"]);
    expect(state.queue).toEqual(["C", "D"]);
  });

  it("replays finished matches in sequence order regardless of input order", () => {
    const finished: FinishedMatch[] = [
      { sequence: 2, home: "A", away: "C", result: "home" },
      { sequence: 1, home: "A", away: "B", result: "home" },
    ];
    const state = computeQueueState(teams, finished, baseRules);
    // Match 1: A beats B -> onCourt [A, C], queue [D, B]
    // Match 2: A beats C -> onCourt [A, D], queue [B, C]
    expect(state.onCourt).toEqual(["A", "D"]);
    expect(state.queue).toEqual(["B", "C"]);
  });

  it("handles a queue of just 3 teams", () => {
    const threeTeams = teams.slice(0, 3);
    const state = computeQueueState(
      threeTeams,
      [{ sequence: 1, home: "A", away: "B", result: "home" }],
      baseRules,
    );
    expect(state.onCourt).toEqual(["A", "C"]);
    expect(state.queue).toEqual(["B"]);
  });

  it("reconciles the queue when the operator overrides the suggested pairing", () => {
    // Mirrors a real event: 4 teams, and on the 5th match the operator
    // pulls in a team the engine still thought was waiting in the queue
    // (A) instead of the one it suggested (C), without C ever "leaving".
    // Before the reconciliation fix this duplicated A in the queue and
    // silently dropped C from ever reappearing.
    const finished: FinishedMatch[] = [
      { sequence: 1, home: "A", away: "B", result: "home" }, // A beats B
      { sequence: 2, home: "A", away: "C", result: "home" }, // A beats C
      { sequence: 3, home: "A", away: "D", result: "away" }, // D beats A
      { sequence: 4, home: "D", away: "B", result: "home" }, // D beats B
      // Suggested next pairing was D x C, but D x A was played instead.
      { sequence: 5, home: "D", away: "A", result: "home" }, // D beats A
    ];
    const state = computeQueueState(teams, finished, baseRules);

    expect(state.onCourt).toEqual(["D", "B"]);
    expect(state.queue).toEqual(["C", "A"]);
    // Every team appears exactly once across onCourt + queue.
    const all = [...(state.onCourt ?? []), ...state.queue];
    expect(new Set(all).size).toBe(all.length);
    expect(all.sort()).toEqual(["A", "B", "C", "D"]);
  });

  it("ignores a corrupt self-match (home === away) instead of duplicating that team", () => {
    const finished: FinishedMatch[] = [
      { sequence: 1, home: "A", away: "A", result: "home" },
      { sequence: 2, home: "A", away: "B", result: "home" },
    ];
    const state = computeQueueState(teams, finished, baseRules);
    // The self-match is dropped entirely — only match 2 (A beats B) applies.
    expect(state.onCourt).toEqual(["A", "C"]);
    expect(state.queue).toEqual(["D", "B"]);
    expect(Object.values(state.queue).filter((id) => id === "A")).toHaveLength(0);
  });
});

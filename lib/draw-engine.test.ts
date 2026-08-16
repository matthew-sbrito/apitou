import { describe, expect, it } from "vitest";
import { drawTeams } from "./draw-engine";
import type { EventPlayer } from "@/types/database";

function makePlayer(overrides: Partial<EventPlayer> & { id: string }): EventPlayer {
  return {
    event_id: "event-1",
    user_id: null,
    name: overrides.id,
    rating: null,
    is_goalkeeper: false,
    is_substitute: false,
    status: "active",
    status_note: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function teamScore(team: EventPlayer[]) {
  return team.reduce((sum, p) => sum + (p.rating ?? 5), 0);
}

describe("drawTeams", () => {
  it("splits evenly when nobody has a rating", () => {
    const players = Array.from({ length: 12 }, (_, i) =>
      makePlayer({ id: `p${i}` }),
    );

    const teams = drawTeams(players, 2, 6, false);

    expect(teams).toHaveLength(2);
    expect(teams[0]).toHaveLength(6);
    expect(teams[1]).toHaveLength(6);
    expect(Math.abs(teamScore(teams[0]) - teamScore(teams[1]))).toBeLessThan(1);
  });

  it("minimizes the spread when ratings are very unequal", () => {
    const players = [
      ...Array.from({ length: 5 }, (_, i) =>
        makePlayer({ id: `strong${i}`, rating: 9 }),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        makePlayer({ id: `weak${i}`, rating: 1 }),
      ),
    ];

    const teams = drawTeams(players, 2, 5, false);
    const spread = Math.abs(teamScore(teams[0]) - teamScore(teams[1]));

    // With only two possible ratings (9 and 1) and 5-a-side teams, the best
    // achievable split is 3 strong + 2 weak vs 2 strong + 3 weak (29 vs 21,
    // spread 8) — you can never land exactly on 25/25 with these inputs.
    // The important assertion is that it's nowhere near the unshuffled
    // worst case (all 5 strong on one team vs all 5 weak: spread 40).
    expect(spread).toBeLessThanOrEqual(8.1);
  });

  it("assigns exactly one goalkeeper per team", () => {
    const players = [
      ...Array.from({ length: 3 }, (_, i) =>
        makePlayer({ id: `gk${i}`, is_goalkeeper: true, rating: 5 }),
      ),
      ...Array.from({ length: 15 }, (_, i) => makePlayer({ id: `line${i}` })),
    ];

    const teams = drawTeams(players, 3, 5, true);

    for (const team of teams) {
      expect(team.filter((p) => p.is_goalkeeper)).toHaveLength(1);
    }
  });

  it("excludes injured and left players", () => {
    const players = [
      makePlayer({ id: "active1" }),
      makePlayer({ id: "active2" }),
      makePlayer({ id: "hurt", status: "injured" }),
      makePlayer({ id: "gone", status: "left" }),
    ];

    const teams = drawTeams(players, 2, 1, false);
    const drafted = teams.flat().map((p) => p.id);

    expect(drafted).not.toContain("hurt");
    expect(drafted).not.toContain("gone");
    expect(drafted).toHaveLength(2);
  });

  it("handles a player count not divisible by teamCount", () => {
    const players = Array.from({ length: 10 }, (_, i) =>
      makePlayer({ id: `p${i}` }),
    );

    const teams = drawTeams(players, 3, 4, false);
    const sizes = teams.map((t) => t.length).sort();

    expect(teams.flat()).toHaveLength(10);
    // Nobody left unassigned, and nobody team gets wildly more than another.
    expect(sizes[2] - sizes[0]).toBeLessThanOrEqual(1);
  });
});

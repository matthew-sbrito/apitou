import { describe, expect, it } from "vitest";
import {
  getScorersList,
  getTopGoalkeepers,
  getTopScorers,
  joinNames,
} from "./scorers";
import type { EventGkStatsRow, EventScorerRow } from "@/types/database";

function scorer(overrides: Partial<EventScorerRow>): EventScorerRow {
  return {
    event_id: "event-1",
    player_id: "player-1",
    player_name: "Fulano",
    goals: 0,
    assists: 0,
    own_goals: 0,
    yellow_cards: 0,
    red_cards: 0,
    fouls: 0,
    ...overrides,
  };
}

function gkStat(overrides: Partial<EventGkStatsRow>): EventGkStatsRow {
  return {
    event_id: "event-1",
    player_id: "player-1",
    player_name: "Fulano",
    matches_played: 1,
    goals_against: 0,
    ...overrides,
  };
}

describe("getTopScorers", () => {
  it("returns an empty array with no scorers", () => {
    expect(getTopScorers([])).toEqual([]);
  });

  it("returns an empty array when nobody scored", () => {
    const scorers = [scorer({ player_id: "a", goals: 0 })];
    expect(getTopScorers(scorers)).toEqual([]);
  });

  it("returns the single top scorer", () => {
    const scorers = [
      scorer({ player_id: "a", goals: 3 }),
      scorer({ player_id: "b", goals: 5 }),
      scorer({ player_id: "c", goals: 1 }),
    ];
    expect(getTopScorers(scorers).map((s) => s.player_id)).toEqual(["b"]);
  });

  it("returns every player tied for the most goals", () => {
    const scorers = [
      scorer({ player_id: "a", goals: 5 }),
      scorer({ player_id: "b", goals: 3 }),
      scorer({ player_id: "c", goals: 5 }),
    ];
    expect(getTopScorers(scorers).map((s) => s.player_id).sort()).toEqual(["a", "c"]);
  });

  it("handles a three-way tie", () => {
    const scorers = [
      scorer({ player_id: "a", goals: 2 }),
      scorer({ player_id: "b", goals: 2 }),
      scorer({ player_id: "c", goals: 2 }),
    ];
    expect(getTopScorers(scorers).map((s) => s.player_id).sort()).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("getScorersList", () => {
  it("excludes players with no goals and no assists", () => {
    const scorers = [
      scorer({ player_id: "a", goals: 0, assists: 0, fouls: 2 }),
      scorer({ player_id: "b", goals: 1, assists: 0 }),
    ];
    expect(getScorersList(scorers).map((s) => s.player_id)).toEqual(["b"]);
  });

  it("keeps players with only an assist and no goals", () => {
    const scorers = [scorer({ player_id: "a", goals: 0, assists: 1 })];
    expect(getScorersList(scorers).map((s) => s.player_id)).toEqual(["a"]);
  });

  it("returns an empty array when nobody scored or assisted", () => {
    const scorers = [
      scorer({ player_id: "a", yellow_cards: 1 }),
      scorer({ player_id: "b", red_cards: 1 }),
    ];
    expect(getScorersList(scorers)).toEqual([]);
  });
});

describe("getTopGoalkeepers", () => {
  it("returns an empty array when nobody played as goalkeeper", () => {
    const stats = [gkStat({ matches_played: 0, goals_against: 0 })];
    expect(getTopGoalkeepers(stats)).toEqual([]);
  });

  it("returns the single least-scored-against goalkeeper", () => {
    const stats = [
      gkStat({ player_id: "a", goals_against: 4 }),
      gkStat({ player_id: "b", goals_against: 1 }),
    ];
    expect(getTopGoalkeepers(stats).map((g) => g.player_id)).toEqual(["b"]);
  });

  it("returns every goalkeeper tied for fewest goals conceded", () => {
    const stats = [
      gkStat({ player_id: "a", goals_against: 2 }),
      gkStat({ player_id: "b", goals_against: 2 }),
      gkStat({ player_id: "c", goals_against: 5 }),
    ];
    expect(getTopGoalkeepers(stats).map((g) => g.player_id).sort()).toEqual([
      "a",
      "b",
    ]);
  });

  it("ignores goalkeepers who never played", () => {
    const stats = [
      gkStat({ player_id: "a", matches_played: 0, goals_against: 0 }),
      gkStat({ player_id: "b", matches_played: 2, goals_against: 1 }),
    ];
    expect(getTopGoalkeepers(stats).map((g) => g.player_id)).toEqual(["b"]);
  });
});

describe("joinNames", () => {
  it("returns an empty string for no names", () => {
    expect(joinNames([])).toBe("");
  });

  it("returns the single name as-is", () => {
    expect(joinNames(["Fulano"])).toBe("Fulano");
  });

  it("joins two names with 'e'", () => {
    expect(joinNames(["Fulano", "Ciclano"])).toBe("Fulano e Ciclano");
  });

  it("joins three or more names with commas and a final 'e'", () => {
    expect(joinNames(["Fulano", "Ciclano", "Beltrano"])).toBe(
      "Fulano, Ciclano e Beltrano",
    );
  });
});

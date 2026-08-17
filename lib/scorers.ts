import type { EventGkStatsRow, EventScorerRow } from "@/types/database";

/** All players tied for the most goals — empty if nobody scored. */
export function getTopScorers(scorers: EventScorerRow[]): EventScorerRow[] {
  const max = Math.max(0, ...scorers.map((s) => s.goals));
  if (max === 0) return [];
  return scorers.filter((s) => s.goals === max);
}

/** Scorers with at least one goal or assist, for the "Artilharia" list —
 * `event_scorers` also includes players whose only events were cards/fouls. */
export function getScorersList(scorers: EventScorerRow[]): EventScorerRow[] {
  return scorers.filter((s) => s.goals > 0 || s.assists > 0);
}

/** All goalkeepers tied for fewest goals conceded, among those who played. */
export function getTopGoalkeepers(gkStats: EventGkStatsRow[]): EventGkStatsRow[] {
  const eligible = gkStats.filter((g) => g.matches_played > 0);
  if (eligible.length === 0) return [];
  const min = Math.min(...eligible.map((g) => g.goals_against));
  return eligible.filter((g) => g.goals_against === min);
}

/** "Fulano" / "Fulano e Ciclano" / "Fulano, Ciclano e Beltrano". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

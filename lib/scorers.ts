import type { EventGkStatsRow, EventScorerRow } from "@/types/database";

/** All players tied for the most goals — empty if nobody scored. */
export function getTopScorers(scorers: EventScorerRow[]): EventScorerRow[] {
  const max = Math.max(0, ...scorers.map((s) => s.goals));
  if (max === 0) return [];
  return scorers.filter((s) => s.goals === max);
}

/** Scorers with at least one goal, for the "Artilharia" list — `event_scorers`
 * is already ordered by goals desc, so no re-sort is needed here. */
export function getGoalsList(scorers: EventScorerRow[]): EventScorerRow[] {
  return scorers.filter((s) => s.goals > 0);
}

/** Players with at least one assist, for the "Assistências" list, ranked by
 * assists desc — `event_scorers` is ordered by goals desc, not assists. */
export function getAssistsList(scorers: EventScorerRow[]): EventScorerRow[] {
  return [...scorers.filter((s) => s.assists > 0)].sort(
    (a, b) => b.assists - a.assists,
  );
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

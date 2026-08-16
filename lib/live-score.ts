import type { MatchEvent } from "@/types/database";

/** Client-side mirror of the `match_scores` SQL view, for instant feedback
 * before the write round-trips (works offline too, since it reads the local
 * event log the same way the DB view reads match_events). */
export function computeLiveScore(
  events: MatchEvent[],
  homeTeamId: string,
  awayTeamId: string,
) {
  const voided = new Set(
    events.filter((e) => e.voided_event_id).map((e) => e.voided_event_id),
  );
  const valid = events.filter((e) => e.type !== "void" && !voided.has(e.id));

  let homeGoals = 0;
  let awayGoals = 0;
  let homePenalties = 0;
  let awayPenalties = 0;

  for (const e of valid) {
    if (e.type === "goal") {
      if (e.event_team_id === homeTeamId) homeGoals++;
      else if (e.event_team_id === awayTeamId) awayGoals++;
    } else if (e.type === "own_goal") {
      if (e.event_team_id === homeTeamId) awayGoals++;
      else if (e.event_team_id === awayTeamId) homeGoals++;
    } else if (e.type === "penalty_goal") {
      if (e.event_team_id === homeTeamId) homePenalties++;
      else if (e.event_team_id === awayTeamId) awayPenalties++;
    }
  }

  return { homeGoals, awayGoals, homePenalties, awayPenalties };
}

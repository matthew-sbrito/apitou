import type { EventPlayer } from "@/types/database";

/**
 * Balanced team draw (PLAN.md §8): snake-draft by rating with one goalkeeper
 * per team, then a local swap optimization pass to minimize the spread
 * between team strengths.
 */
export function drawTeams(
  players: EventPlayer[],
  teamCount: number,
  teamSize: number,
  hasGoalkeeper: boolean,
): EventPlayer[][] {
  const active = players.filter((p) => p.status === "active" && !p.is_substitute);

  // Players without a rating get the median rating.
  const rated = active
    .filter((p) => p.rating != null)
    .map((p) => p.rating as number);
  const median = rated.length
    ? rated.sort((a, b) => a - b)[Math.floor(rated.length / 2)]
    : 5;
  const score = (p: EventPlayer) => (p.rating ?? median) + Math.random() * 0.01;

  const teams: EventPlayer[][] = Array.from({ length: teamCount }, () => []);

  // Goalkeepers: one per team.
  if (hasGoalkeeper) {
    const goalkeepers = active
      .filter((p) => p.is_goalkeeper)
      .sort((a, b) => score(b) - score(a));
    goalkeepers.slice(0, teamCount).forEach((gk, i) => teams[i].push(gk));
  }

  // Snake draft by descending score.
  const assigned = new Set(teams.flat().map((p) => p.id));
  const pool = active
    .filter((p) => !assigned.has(p.id))
    .sort((a, b) => score(b) - score(a));

  const maxPerTeam = teamSize + (hasGoalkeeper ? 1 : 0);
  let idx = 0;
  let dir = 1;
  for (const p of pool) {
    if (teams[idx].length < maxPerTeam) teams[idx].push(p);
    idx += dir;
    if (idx === teamCount) {
      idx = teamCount - 1;
      dir = -1;
    }
    if (idx === -1) {
      idx = 0;
      dir = 1;
    }
  }

  return optimize(teams, score);
}

function optimize(
  teams: EventPlayer[][],
  score: (p: EventPlayer) => number,
): EventPlayer[][] {
  const sum = (t: EventPlayer[]) => t.reduce((a, p) => a + score(p), 0);
  const spread = (ts: EventPlayer[][]) => {
    const sums = ts.map(sum);
    return Math.max(...sums) - Math.min(...sums);
  };

  let improved = true;
  while (improved) {
    improved = false;
    let best = spread(teams);
    for (let a = 0; a < teams.length; a++) {
      for (let b = a + 1; b < teams.length; b++) {
        for (let i = 0; i < teams[a].length; i++) {
          for (let j = 0; j < teams[b].length; j++) {
            // Never swap a goalkeeper for an outfield player.
            if (teams[a][i].is_goalkeeper !== teams[b][j].is_goalkeeper) continue;
            [teams[a][i], teams[b][j]] = [teams[b][j], teams[a][i]];
            const s = spread(teams);
            if (s < best - 1e-9) {
              best = s;
              improved = true;
            } else {
              [teams[a][i], teams[b][j]] = [teams[b][j], teams[a][i]];
            }
          }
        }
      }
    }
  }
  return teams;
}

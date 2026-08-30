import type { EventRules, EventTeam } from "@/types/database";

export type QueueState = {
  onCourt: [string, string] | null;
  queue: string[];
  /** Consecutive matches each team has played without leaving the court. */
  reign: Record<string, number>;
  /** Longest reign each team has ever reached — feeds the súmula's "maior
   * reinado" highlight (§11). Not in PLAN.md §7.1's QueueState verbatim. */
  maxReign: Record<string, number>;
};

export type FinishedMatch = {
  sequence: number;
  home: string;
  away: string;
  result: "home" | "away" | "draw";
};

/**
 * "Quem ganha fica" queue engine (PLAN.md §7.2). Pure and replayable: the
 * queue is never stored as mutable state, only derived by reducing over
 * finished matches — that's what makes it safe offline and undo-able.
 */
export function applyResult(
  state: QueueState,
  match: FinishedMatch,
  rules: EventRules,
): QueueState {
  // `state.onCourt` is only the *suggested* pairing — PLAN.md §7.4 requires
  // the operator can always override which two teams actually play. When
  // the recorded match doesn't match that suggestion, reconcile first: a
  // suggested team that didn't actually play got benched without playing
  // (send it to the queue), and a team that DID play but wasn't suggested
  // was pulled in from the queue (drop it there so the loss below doesn't
  // add it a second time). Skipping this step is what let an overridden
  // team accumulate duplicate queue entries every time it played again.
  const actualPair = new Set([match.home, match.away]);
  const benched = (state.onCourt ?? []).filter((t) => !actualPair.has(t));
  const reconciledQueue = [
    ...state.queue.filter((t) => !actualPair.has(t)),
    ...benched,
  ];

  const reign = { ...state.reign };
  let stays: string[] = [];
  let leaves: string[] = [];

  if (match.result === "draw") {
    // The defender is whoever has been on court longer.
    const [defender, challenger] =
      (reign[match.home] ?? 0) >= (reign[match.away] ?? 0)
        ? [match.home, match.away]
        : [match.away, match.home];

    switch (rules.drawRule) {
      case "both_leave":
        leaves = [defender, challenger];
        break;
      case "defender_leaves":
        leaves = [defender];
        stays = [challenger];
        break;
      case "challenger_leaves":
        leaves = [challenger];
        stays = [defender];
        break;
      case "penalties":
        // Penalty shootouts should resolve `result` to 'home'/'away' before
        // reaching this function — draw + 'penalties' is treated the same
        // as both_leave so the queue never stalls.
        leaves = [defender, challenger];
        break;
    }
  } else {
    const winner = match.result === "home" ? match.home : match.away;
    const loser = match.result === "home" ? match.away : match.home;
    stays = [winner];
    leaves = [loser];
  }

  // Reign: whoever stays gets +1; hitting the cap sends them to the back too.
  const maxReign = { ...state.maxReign };
  stays = stays.filter((team) => {
    reign[team] = (reign[team] ?? 0) + 1;
    maxReign[team] = Math.max(maxReign[team] ?? 0, reign[team]);
    if (rules.maxReign && reign[team] >= rules.maxReign) {
      leaves.push(team);
      return false;
    }
    return true;
  });
  leaves.forEach((team) => {
    reign[team] = 0;
  });

  const queue = [...reconciledQueue, ...leaves];
  const onCourt = [...stays];
  while (onCourt.length < 2 && queue.length) onCourt.push(queue.shift()!);

  return {
    onCourt: onCourt.length === 2 ? (onCourt as [string, string]) : null,
    queue,
    reign,
    maxReign,
  };
}

export function computeQueueState(
  teams: Pick<EventTeam, "id" | "queue_position">[],
  finished: FinishedMatch[],
  rules: EventRules,
): QueueState {
  const ordered = [...teams].sort((a, b) => a.queue_position - b.queue_position);
  const initial: QueueState = {
    onCourt: ordered.length >= 2 ? [ordered[0].id, ordered[1].id] : null,
    queue: ordered.slice(2).map((t) => t.id),
    reign: Object.fromEntries(teams.map((t) => [t.id, 0])),
    maxReign: Object.fromEntries(teams.map((t) => [t.id, 0])),
  };

  return [...finished]
    // A match where a team played itself should never exist (the
    // `different_teams` DB constraint and the next-match UI both block it),
    // but a stray corrupt/legacy row would otherwise duplicate that team
    // into `queue` while it's also `onCourt` via `stays` — filtering it out
    // here keeps one bad historical row from permanently poisoning every
    // future replay of the queue.
    .filter((match) => match.home !== match.away)
    .sort((a, b) => a.sequence - b.sequence)
    .reduce((state, match) => applyResult(state, match, rules), initial);
}

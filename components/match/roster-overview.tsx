import type { TeamRoster } from "@/components/match/player-action-dialog";

/** Read-only per-team lineup — shows who's on each side, flagging anyone
 * whose persistent team (`teamAssignments`) differs from the team they're
 * lined up for this match as "(emprestado de X)". Shared across the
 * scheduled, running, and paused match-screen states so the operator can
 * always see the current lineup without leaving the screen. */
export function RosterOverview({
  rosters,
  teamAssignments,
  teamNameById,
}: {
  rosters: TeamRoster[];
  teamAssignments: Record<string, string>;
  teamNameById: Record<string, string>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {rosters.map(({ team, players: roster }) => (
        <div key={team.id} className="rounded-xl border border-white/10 p-3 text-sm">
          <p className="font-semibold">{team.name}</p>
          <p className="text-muted-foreground">{roster.length} jogador(es)</p>
          <ul className="mt-2 flex flex-col gap-0.5">
            {roster.map((p) => (
              <li key={p.id} className="flex items-center gap-1 text-xs">
                <span className="truncate">{p.name}</span>
                {p.is_goalkeeper && <span className="shrink-0 text-apito-yellow">GK</span>}
                {teamAssignments[p.id] && teamAssignments[p.id] !== team.id && (
                  <span className="shrink-0 text-apito-yellow">
                    (emprestado de {teamNameById[teamAssignments[p.id]] ?? "outro time"})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

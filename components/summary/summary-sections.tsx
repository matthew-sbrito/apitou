import { getAssistsList, getGoalsList, joinNames } from "@/lib/scorers";
import { cn } from "@/lib/utils";
import type {
  EventGkStatsRow,
  EventScorerRow,
  EventStandingRow,
} from "@/types/database";
import { Crown, Shield, Trophy } from "lucide-react";

export function SummarySections({
  topScorers,
  longestReign,
  teamName,
  bestGoalkeepers,
  standings,
  scorers,
  highlightsGridClassName = "grid-cols-1 sm:grid-cols-2",
}: {
  topScorers: EventScorerRow[];
  longestReign: [string, number] | undefined;
  teamName: Record<string, string>;
  bestGoalkeepers: EventGkStatsRow[];
  standings: EventStandingRow[];
  scorers: EventScorerRow[];
  highlightsGridClassName?: string;
}) {
  return (
    <>
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Trophy className="h-5 w-5 text-apito-yellow" />
          Destaques
        </h2>
        <div className={cn("grid gap-3", highlightsGridClassName)}>
          {topScorers.length > 0 && (
            <HighlightCard
              icon={<span className="text-2xl leading-none">⚽</span>}
              label="Artilheiro do evento"
              value={joinNames(topScorers.map((s) => s.player_name))}
              detail={`${topScorers[0].goals} gol(s)`}
            />
          )}
          {longestReign && longestReign[1] > 0 && (
            <HighlightCard
              icon={<Crown className="h-6 w-6 text-apito-yellow" />}
              label="Maior reinado"
              value={teamName[longestReign[0]] ?? "?"}
              detail={`${longestReign[1]} partida(s) seguidas`}
            />
          )}
          {bestGoalkeepers.length > 0 && (
            <HighlightCard
              icon={<Shield className="h-6 w-6 text-apito-yellow" />}
              label="Goleiro menos vazado"
              value={joinNames(bestGoalkeepers.map((g) => g.player_name))}
              detail={`${bestGoalkeepers[0].goals_against} gol(s) sofrido(s)`}
            />
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Classificação</h2>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-card text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-2 py-2 text-center">J</th>
                <th className="px-2 py-2 text-center">V</th>
                <th className="px-2 py-2 text-center">E</th>
                <th className="px-2 py-2 text-center">D</th>
                <th className="px-2 py-2 text-center">SG</th>
                <th className="px-2 py-2 text-center">Pts</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => (
                <tr key={row.team_id} className="border-t border-white/10">
                  <td className="px-3 py-2 font-medium">{row.team_name}</td>
                  <td className="px-2 py-2 text-center">{row.played}</td>
                  <td className="px-2 py-2 text-center">{row.wins}</td>
                  <td className="px-2 py-2 text-center">{row.draws}</td>
                  <td className="px-2 py-2 text-center">{row.losses}</td>
                  <td className="px-2 py-2 text-center">{row.goal_diff}</td>
                  <td className="px-2 py-2 text-center font-bold text-apito-yellow">
                    {row.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Artilharia</h2>
        <ul className="flex flex-col gap-2">
          {getGoalsList(scorers)
            .slice(0, 10)
            .map((s) => (
              <li
                key={s.player_id}
                className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-2 text-sm"
              >
                <span>{s.player_name}</span>
                <span className="text-muted-foreground">{s.goals} ⚽</span>
              </li>
            ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Assistências</h2>
        <ul className="flex flex-col gap-2">
          {getAssistsList(scorers)
            .slice(0, 10)
            .map((s) => (
              <li
                key={s.player_id}
                className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-2 text-sm"
              >
                <span>{s.player_name}</span>
                <span className="text-muted-foreground">{s.assists} 👟</span>
              </li>
            ))}
        </ul>
      </section>
    </>
  );
}

function HighlightCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 p-4">
      <span className="shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

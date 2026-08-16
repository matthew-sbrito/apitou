import { ShareCard } from "@/components/summary/share-card";
import { computeQueueState, type FinishedMatch } from "@/lib/queue-engine";
import { createClient } from "@/lib/supabase/server";
import { Crown, Shield, Trophy } from "lucide-react";
import { notFound } from "next/navigation";

export default async function SummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  const [
    { data: event },
    { data: standings },
    { data: scorers },
    { data: gkStats },
    { data: teams },
    { data: results },
  ] = await Promise.all([
    supabase.from("events").select("*").eq("id", eventId).single(),
    supabase.from("event_standings").select("*").eq("event_id", eventId),
    supabase.from("event_scorers").select("*").eq("event_id", eventId),
    supabase.from("event_gk_stats").select("*").eq("event_id", eventId),
    supabase
      .from("event_teams")
      .select("id, queue_position, name")
      .eq("event_id", eventId),
    supabase
      .from("match_results")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "finished"),
  ]);

  if (!event) notFound();

  const teamName = Object.fromEntries((teams ?? []).map((t) => [t.id, t.name]));

  const topScorer = (scorers ?? [])[0] ?? null;
  const bestGoalkeeper = (gkStats ?? [])
    .filter((g) => g.matches_played > 0)
    .sort((a, b) => a.goals_against - b.goals_against)[0];

  const finished: FinishedMatch[] = (results ?? []).map((r) => ({
    sequence: r.sequence,
    home: r.home_team_id,
    away: r.away_team_id,
    result: r.result,
  }));
  const queueState =
    teams && teams.length > 0
      ? computeQueueState(teams, finished, event.rules)
      : null;
  const reignEntries = queueState ? Object.entries(queueState.maxReign) : [];
  const longestReign = reignEntries.sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Súmula
        </h1>
        <p className="text-sm text-muted-foreground">{event.name}</p>
      </div>

      <ShareCard
        eventName={event.name}
        standings={standings ?? []}
        topScorerName={topScorer?.player_name ?? null}
        topScorerGoals={topScorer?.goals ?? 0}
        longestReignTeam={longestReign ? teamName[longestReign[0]] : null}
        longestReignCount={longestReign?.[1] ?? 0}
      />

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Trophy className="h-5 w-5 text-apito-yellow" />
          Destaques
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {topScorer && (
            <HighlightCard
              icon={<span className="text-2xl leading-none">⚽</span>}
              label="Artilheiro do evento"
              value={topScorer.player_name}
              detail={`${topScorer.goals} gol(s)`}
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
          {bestGoalkeeper && (
            <HighlightCard
              icon={<Shield className="h-6 w-6 text-apito-yellow" />}
              label="Goleiro menos vazado"
              value={bestGoalkeeper.player_name}
              detail={`${bestGoalkeeper.goals_against} gol(s) sofrido(s)`}
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
              {(standings ?? []).map((row) => (
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
          {(scorers ?? []).slice(0, 10).map((s) => (
            <li
              key={s.player_id}
              className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-2 text-sm"
            >
              <span>{s.player_name}</span>
              <span className="flex gap-3 text-muted-foreground">
                {s.goals > 0 && <span>{s.goals} gol(s)</span>}
                {s.assists > 0 && <span>{s.assists} assist.</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
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

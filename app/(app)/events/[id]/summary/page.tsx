import { ShareButtons } from "@/components/summary/share-buttons";
import { SummarySections } from "@/components/summary/summary-sections";
import { computeQueueState, type FinishedMatch } from "@/lib/queue-engine";
import { getTopGoalkeepers, getTopScorers } from "@/lib/scorers";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function SummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const { event, standings, scorers, gkStats, teams, results } =
    await getData(eventId);

  if (!event) notFound();

  const teamName = Object.fromEntries((teams ?? []).map((t) => [t.id, t.name]));

  const topScorers = getTopScorers(scorers ?? []);
  const bestGoalkeepers = getTopGoalkeepers(gkStats ?? []);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Súmula
          </h1>
          <p className="text-sm text-muted-foreground">{event.name}</p>
          {(event.location ||
            (event.latitude != null && event.longitude != null)) && (
            <p className="text-sm text-muted-foreground">
              {event.location}
              {event.latitude != null && event.longitude != null && (
                <>
                  {event.location ? " · " : null}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    ver no mapa
                  </a>
                </>
              )}
            </p>
          )}
        </div>
        <ShareButtons eventName={event.name} elementRefId="share-container" />
      </div>

      <div className="flex flex-col gap-6">
        <SummarySections
          topScorers={topScorers}
          longestReign={longestReign}
          teamName={teamName}
          bestGoalkeepers={bestGoalkeepers}
          standings={standings ?? []}
          scorers={scorers ?? []}
        />
      </div>

      <div aria-hidden="true" className="fixed left-[-9999px] top-0">
        <div
          id="share-container"
          className="flex w-160 flex-col gap-6 bg-background p-6"
        >
          <SummarySections
            topScorers={topScorers}
            longestReign={longestReign}
            teamName={teamName}
            bestGoalkeepers={bestGoalkeepers}
            standings={standings ?? []}
            scorers={scorers ?? []}
            highlightsGridClassName="grid-cols-2"
          />
        </div>
      </div>
    </div>
  );
}

async function getData(eventId: string) {
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

  return { event, standings, scorers, gkStats, teams, results };
}

"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PlayCircle } from "lucide-react";
import { useMatchStore } from "@/components/match/match-store-provider";
import { useMatchActions } from "@/hooks/use-match-actions";
import { RosterOverview } from "@/components/match/roster-overview";
import { TeamSwapSection } from "@/components/match/team-swap-section";
import type { TeamRoster } from "@/components/match/player-action-dialog";

/** Shown between a match being created (`scheduled`) and "Apitar início" —
 * lets the operator see and adjust who's on each side before the clock
 * starts. `movePlayerToTeam` already special-cases `status === "scheduled"`
 * (no match_events, since there's no clock yet to timestamp them). */
export function ScheduledPanel() {
  const homeTeam = useMatchStore((s) => s.homeTeam);
  const awayTeam = useMatchStore((s) => s.awayTeam);
  const lineups = useMatchStore((s) => s.lineups);
  const players = useMatchStore((s) => s.players);
  const allPlayers = useMatchStore((s) => s.allPlayers);
  const allTeams = useMatchStore((s) => s.allTeams);
  const teamAssignments = useMatchStore((s) => s.teamAssignments);
  const actions = useMatchActions();

  const rosters: TeamRoster[] = useMemo(
    () =>
      [homeTeam, awayTeam].map((team) => ({
        team,
        players: lineups
          .filter((l) => l.event_team_id === team.id)
          .map((l) => players[l.event_player_id])
          .filter((p) => p && p.status === "active"),
      })),
    [homeTeam, awayTeam, lineups, players],
  );

  const teamNameById = Object.fromEntries(allTeams.map((t) => [t.id, t.name]));

  return (
    <div className="flex w-full max-w-md flex-col gap-6 py-8">
      <RosterOverview
        rosters={rosters}
        teamAssignments={teamAssignments}
        teamNameById={teamNameById}
      />

      <TeamSwapSection
        allPlayers={allPlayers}
        allTeams={allTeams}
        teamAssignments={teamAssignments}
        teamNameById={teamNameById}
      />

      <Button type="button" size="lg" onClick={() => actions.start()}>
        <PlayCircle className="h-5 w-5" />
        Apitar início
      </Button>
    </div>
  );
}

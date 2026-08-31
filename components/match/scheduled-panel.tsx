"use client";

import { cancelScheduledMatch } from "@/app/(app)/events/[id]/queue-actions";
import { useMatchStore } from "@/components/match/match-store-provider";
import type { TeamRoster } from "@/components/match/player-action-dialog";
import { RosterOverview } from "@/components/match/roster-overview";
import { TeamSwapSection } from "@/components/match/team-swap-section";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useMatchActions } from "@/hooks/use-match-actions";
import { PlayCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import { toast } from "sonner";

/** Shown between a match being created (`scheduled`) and "Apitar início" —
 * lets the operator see and adjust who's on each side before the clock
 * starts. `movePlayerToTeam` already special-cases `status === "scheduled"`
 * (no match_events, since there's no clock yet to timestamp them). */
export function ScheduledPanel() {
  const router = useRouter();
  const matchId = useMatchStore((s) => s.match.id);
  const eventId = useMatchStore((s) => s.match.event_id);
  const homeTeam = useMatchStore((s) => s.homeTeam);
  const awayTeam = useMatchStore((s) => s.awayTeam);
  const lineups = useMatchStore((s) => s.lineups);
  const players = useMatchStore((s) => s.players);
  const allPlayers = useMatchStore((s) => s.allPlayers);
  const allTeams = useMatchStore((s) => s.allTeams);
  const teamAssignments = useMatchStore((s) => s.teamAssignments);
  const actions = useMatchActions();
  const [pending, startTransition] = useTransition();

  function confirmCancel() {
    startTransition(async () => {
      const result = await cancelScheduledMatch(matchId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      router.push(
        result.previousMatchId
          ? `/events/${eventId}/match/${result.previousMatchId}`
          : `/events/${eventId}`,
      );
    });
  }

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

      <div className="flex flex-col gap-2">
        <Button type="button" size="lg" onClick={() => actions.start()}>
          <PlayCircle className="h-5 w-5" />
          Apitar início
        </Button>

        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button type="button" variant="destructive" disabled={pending} />
            }
          >
            <XCircle className="h-4 w-4" />
            Cancelar essa partida
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar essa partida?</AlertDialogTitle>
              <AlertDialogDescription>
                Apaga essa partida agendada e volta pra tela da partida
                anterior.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={pending}
                onClick={confirmCancel}
              >
                {pending ? "Cancelando..." : "Cancelar partida"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

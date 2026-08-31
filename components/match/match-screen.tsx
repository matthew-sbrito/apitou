"use client";

import { ActionBar } from "@/components/match/action-bar";
import { MatchClock } from "@/components/match/match-clock";
import {
  MatchStoreProvider,
  useMatchStore,
} from "@/components/match/match-store-provider";
import { NextMatchPanel } from "@/components/match/next-match-panel";
import { PausePanel } from "@/components/match/pause-panel";
import type { TeamRoster } from "@/components/match/player-action-dialog";
import { RosterOverview } from "@/components/match/roster-overview";
import { ScheduledPanel } from "@/components/match/scheduled-panel";
import { ScoreBoard } from "@/components/match/score-board";
import { SuspensionList } from "@/components/match/suspension-list";
import { Button } from "@/components/ui/button";
import { useWakeLock } from "@/hooks/use-wake-lock";
import type { MatchStoreState } from "@/store/match-store";
import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo } from "react";

export function MatchScreen({
  initial,
  readOnly = false,
  readOnlyReason = "finished",
}: {
  initial: MatchStoreState;
  readOnly?: boolean;
  /** Why the viewer can't act — changes the banner copy. A member is
   * locked out regardless of the match's own status; a finished event
   * only locks matches once there's nothing left to apitar. */
  readOnlyReason?: "finished" | "member";
}) {
  return (
    <MatchStoreProvider initial={initial}>
      <MatchScreenWrapper>
        <MatchScreenInner readOnly={readOnly} readOnlyReason={readOnlyReason} />
      </MatchScreenWrapper>
    </MatchStoreProvider>
  );
}

function MatchScreenInner({
  readOnly,
  readOnlyReason,
}: {
  readOnly: boolean;
  readOnlyReason: "finished" | "member";
}) {
  const status = useMatchStore((s) => s.match.status);
  const eventId = useMatchStore((s) => s.match.event_id);
  const setClockOffset = useMatchStore((s) => s.setClockOffset);
  const homeTeam = useMatchStore((s) => s.homeTeam);
  const awayTeam = useMatchStore((s) => s.awayTeam);
  const lineups = useMatchStore((s) => s.lineups);
  const players = useMatchStore((s) => s.players);
  const allTeams = useMatchStore((s) => s.allTeams);
  const teamAssignments = useMatchStore((s) => s.teamAssignments);
  useWakeLock(!readOnly && status === "running");

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
  const teamNameById = useMemo(
    () => Object.fromEntries(allTeams.map((t) => [t.id, t.name])),
    [allTeams],
  );

  useEffect(() => {
    const requestedAt = Date.now();
    fetch("/api/time")
      .then((res) => res.json())
      .then(({ now }: { now: number }) => {
        // Rough one-way-latency correction: assume the request took as long
        // going as coming back, so the server's `now` landed at the midpoint.
        const latency = (Date.now() - requestedAt) / 2;
        setClockOffset(Math.round(now + latency - Date.now()));
      })
      .catch(() => {
        // No network yet — keep offset at 0 and trust the device clock
        // until a fetch succeeds.
      });
  }, [setClockOffset]);

  if (readOnly) {
    return (
      <div className="flex flex-col gap-6">
        <ReadOnlyBanner reason={readOnlyReason} />
        {(status === "running" || status === "paused") && <MatchClock />}
        <ScoreBoard />
        <Button
          render={<Link href={`/events/${eventId}/summary`} />}
          nativeButton={false}
        >
          Ver súmula
        </Button>
      </div>
    );
  }

  if (status === "scheduled") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <ScoreBoard />
        <ScheduledPanel />
      </div>
    );
  }

  if (status === "finished") {
    return (
      <div className="flex flex-col gap-6">
        <ScoreBoard />
        <NextMatchPanel eventId={eventId} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <MatchClock />
      <ScoreBoard />
      {status === "running" && (
        <RosterOverview
          rosters={rosters}
          teamAssignments={teamAssignments}
          teamNameById={teamNameById}
        />
      )}
      {status === "running" && <SuspensionList />}
      {status === "running" && <ActionBar />}
      {status === "paused" && <PausePanel />}
    </div>
  );
}

function MatchScreenWrapper({ children }: { children: React.ReactNode }) {
  const eventId = useMatchStore((s) => s.match.event_id);
  const eventStatus = useMatchStore((s) => s.match.status);

  return (
    <div
      className="flex flex-col data-[status=finished]:gap-1"
      data-status={eventStatus}
    >
      <Button
        render={<Link href={`/events/${eventId}`} />}
        nativeButton={false}
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Voltar para a pelada"
      >
        <ArrowLeft className="h-6 w-6 text-foreground" />
      </Button>
      {children}
    </div>
  );
}

function ReadOnlyBanner({ reason }: { reason: "finished" | "member" }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-card px-4 py-3 text-sm text-muted-foreground">
      <Lock className="h-4 w-4 shrink-0 text-apito-yellow" />
      {reason === "member"
        ? "Você tá vendo como convidado — só o dono apita essa partida."
        : "Evento encerrado — essa partida ficou travada, só pra consulta."}
    </div>
  );
}

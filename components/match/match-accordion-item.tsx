"use client";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { matchStatusLabel } from "@/lib/labels";
import type { MatchStatus } from "@/types/database";
import { ChevronDown, Square } from "lucide-react";

export type PlayerRow = {
  id: string;
  name: string;
  isGoalkeeper: boolean;
  goals: number;
  yellowCards: number;
  redCards: number;
  /** Set when this player's persistent team differs from the team they
   * played for in this match — i.e. they were borrowed for one game. */
  loanFromTeamName?: string;
};

export type TimelineEntry = {
  id: string;
  clockLabel: string;
  label: string;
  playerName: string | null;
  teamName: string | null;
};

export type MatchSummaryVM = {
  id: string;
  sequence: number;
  status: MatchStatus;
  durationLabel: string;
  homeTeam: { id: string; name: string; color: string | null };
  awayTeam: { id: string; name: string; color: string | null };
  homeGoals: number;
  awayGoals: number;
  homeRoster: PlayerRow[];
  awayRoster: PlayerRow[];
  timeline: TimelineEntry[];
};

export function MatchAccordionItem({ match }: { match: MatchSummaryVM }) {
  return (
    <Collapsible className="rounded-2xl border border-white/10">
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 p-4 text-left">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-semibold">Partida {match.sequence}:</span>
          <span className="truncate">{match.homeTeam.name}</span>
          <span className="font-bold text-apito-yellow">
            {match.homeGoals} x {match.awayGoals}
          </span>
          <span className="truncate">{match.awayTeam.name}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <Badge variant="outline">{matchStatusLabel[match.status]}</Badge>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent className="border-t border-white/10 p-4">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Tempo de bola rolando: {match.durationLabel}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <TeamRoster team={match.homeTeam} roster={match.homeRoster} />
            <TeamRoster team={match.awayTeam} roster={match.awayRoster} />
          </div>

          {match.timeline.length > 0 && (
            <div className="flex flex-col gap-1.5 border-t border-white/10 pt-4">
              <p className="mb-1 text-sm font-semibold">Eventos da partida</p>
              {match.timeline.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between text-sm text-muted-foreground"
                >
                  <span>
                    <span className="tabular-nums text-foreground">
                      {entry.clockLabel}
                    </span>{" "}
                    · {entry.label}
                    {entry.playerName ? ` — ${entry.playerName}` : ""}
                  </span>
                  {entry.teamName && (
                    <span className="shrink-0 text-xs">{entry.teamName}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function TeamRoster({
  team,
  roster,
}: {
  team: { name: string; color: string | null };
  roster: PlayerRow[];
}) {
  return (
    <div className="rounded-xl bg-card p-3">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: team.color ?? "var(--apito-yellow)" }}
        />
        {team.name}
      </p>
      <ul className="flex flex-col gap-1.5">
        {roster.map((player) => (
          <li
            key={player.id}
            className="flex items-center justify-between text-sm"
          >
            <span className="truncate">
              {player.name}
              {player.isGoalkeeper && (
                <span className="ml-1.5 text-xs text-apito-yellow">GK</span>
              )}
              {player.loanFromTeamName && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  (emprestado de {player.loanFromTeamName})
                </span>
              )}
            </span>
            <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              {!!player.goals && (
                <span
                  className="flex items-center gap-0.5"
                  title={`${player.goals} gol(s)`}
                >
                  <span className="text-base">⚽</span>
                  {player.goals}
                </span>
              )}
              {!!player.yellowCards && (
                <span
                  className="flex items-center gap-0.5"
                  title="Cartão amarelo"
                >
                  <Square className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {player.yellowCards}
                </span>
              )}
              {!!player.redCards && (
                <span
                  className="flex items-center gap-0.5"
                  title="Cartão vermelho"
                >
                  <Square className="h-3 w-3 fill-apito-red text-apito-red" />
                  {player.redCards}
                </span>
              )}
            </span>
          </li>
        ))}
        {roster.length === 0 && (
          <li className="text-xs text-muted-foreground">Ninguém escalado.</li>
        )}
      </ul>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Wrench } from "lucide-react";
import { useMatchActions } from "@/hooks/use-match-actions";
import { RosterOverview } from "@/components/match/roster-overview";
import { TeamSwapSection } from "@/components/match/team-swap-section";
import { PlayerActionDialog, type TeamRoster } from "@/components/match/player-action-dialog";
import type { EventPlayer, EventTeam, MatchEvent, MatchLineup } from "@/types/database";

const scoringTypeLabel: Record<string, string> = {
  goal: "Gol",
  own_goal: "Gol contra",
  penalty_goal: "Pênalti",
};

/** Bench players (own reserves) and active players borrowed from a team
 * that isn't on the court right now — the pool offered to the injury
 * flow's "substituir por suplente" picker. */
function getSubstitutePools(
  allPlayers: EventPlayer[],
  lineups: MatchLineup[],
  matchTeamIds: Set<string>,
  teamAssignments: Record<string, string>,
) {
  const lineupIds = new Set(lineups.map((l) => l.event_player_id));

  const bench = allPlayers.filter(
    (p) => p.is_substitute && p.status === "active" && !lineupIds.has(p.id),
  );
  const benchIds = new Set(bench.map((p) => p.id));
  const otherTeamPlayers = allPlayers.filter(
    (p) =>
      !p.is_substitute &&
      p.status === "active" &&
      !lineupIds.has(p.id) &&
      !benchIds.has(p.id) &&
      teamAssignments[p.id] != null &&
      !matchTeamIds.has(teamAssignments[p.id]),
  );

  return { bench, otherTeamPlayers };
}

/** The full set of mid-match adjustment tools — lineup overview, transfer a
 * player between teams, injury/substitution, and score correction. Shared
 * between `PausePanel` (full-screen, only while paused) and the "Ajustes"
 * sheet in `ActionBar` (overlay while the match keeps running) — none of the
 * underlying actions check `match.status`, so the same component works in
 * both places. */
export function MatchAdjustments({
  rosters,
  allPlayers,
  allTeams,
  lineups,
  teamAssignments,
  events,
  players,
}: {
  rosters: TeamRoster[];
  allPlayers: EventPlayer[];
  allTeams: EventTeam[];
  lineups: MatchLineup[];
  teamAssignments: Record<string, string>;
  events: MatchEvent[];
  players: Record<string, EventPlayer>;
}) {
  const teamNameById = Object.fromEntries(allTeams.map((t) => [t.id, t.name]));

  const voided = new Set(
    events.filter((e) => e.voided_event_id).map((e) => e.voided_event_id),
  );
  const scoringEvents = events
    .filter(
      (e) =>
        ["goal", "own_goal", "penalty_goal"].includes(e.type) && !voided.has(e.id),
    )
    .slice(-8)
    .reverse();

  return (
    <div className="flex flex-col gap-6">
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

      <InjurySection
        rosters={rosters}
        allPlayers={allPlayers}
        lineups={lineups}
        teamAssignments={teamAssignments}
        teamNameById={teamNameById}
      />

      {scoringEvents.length > 0 && (
        <CorrectionSection events={scoringEvents} rosters={rosters} players={players} />
      )}
    </div>
  );
}

function InjurySection({
  rosters,
  allPlayers,
  lineups,
  teamAssignments,
  teamNameById,
}: {
  rosters: TeamRoster[];
  allPlayers: EventPlayer[];
  lineups: MatchLineup[];
  teamAssignments: Record<string, string>;
  teamNameById: Record<string, string>;
}) {
  const actions = useMatchActions();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [mode, setMode] = useState<"sub" | "short" | "return">("short");
  const [subInPlayerId, setSubInPlayerId] = useState<string | null>(null);
  const [markUnavailable, setMarkUnavailable] = useState(false);
  const [pending, setPending] = useState(false);

  const matchTeamIds = new Set(rosters.map((r) => r.team.id));
  const { bench, otherTeamPlayers } = getSubstitutePools(
    allPlayers,
    lineups,
    matchTeamIds,
    teamAssignments,
  );
  const substituteOptions = [...bench, ...otherTeamPlayers];

  const roster = rosters.find((r) => r.team.id === teamId);

  async function submit() {
    if (!teamId || !playerId) return;
    setPending(true);
    await actions.recordInjury({
      teamId,
      playerId,
      subInPlayerId: mode === "sub" ? subInPlayerId ?? undefined : undefined,
      markUnavailable: markUnavailable || mode !== "return",
    });
    setPending(false);
    setTeamId(null);
    setPlayerId(null);
    setSubInPlayerId(null);
    setMarkUnavailable(false);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 p-4">
      <p className="flex items-center gap-2 font-semibold">
        <Wrench className="h-4 w-4 text-apito-yellow" />
        Lesão / substituição
      </p>

      <div className="grid grid-cols-2 gap-2">
        {rosters.map(({ team }) => (
          <Button
            key={team.id}
            type="button"
            size="sm"
            variant={teamId === team.id ? "default" : "outline"}
            onClick={() => {
              setTeamId(team.id);
              setPlayerId(null);
            }}
          >
            {team.name}
          </Button>
        ))}
      </div>

      {roster && (
        <Select value={playerId ?? undefined} onValueChange={setPlayerId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Jogador">
              {(id: string | null) =>
                roster.players.find((p) => p.id === id)?.name ?? "Jogador"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {roster.players.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {playerId && (
        <>
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="sub" /> Substituir por suplente
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="short" /> Time joga desfalcado
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="return" /> Vai voltar, só atendimento
            </label>
          </RadioGroup>

          {mode === "sub" && (
            <Select value={subInPlayerId ?? undefined} onValueChange={setSubInPlayerId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Suplente">
                  {(id: string | null) =>
                    substituteOptions.find((p) => p.id === id)?.name ?? "Suplente"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {bench.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Reservas</SelectLabel>
                    {bench.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {otherTeamPlayers.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Jogadores de outros times</SelectLabel>
                    {otherTeamPlayers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({teamNameById[teamAssignments[p.id]] ?? "outro time"})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          )}

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={markUnavailable}
              onCheckedChange={(c) => setMarkUnavailable(c === true)}
            />
            Marcar como indisponível no evento
          </label>

          <Button
            type="button"
            size="sm"
            disabled={pending || (mode === "sub" && !subInPlayerId)}
            onClick={submit}
          >
            {pending ? "Salvando..." : "Confirmar"}
          </Button>
        </>
      )}
    </div>
  );
}

function CorrectionSection({
  events,
  rosters,
  players,
}: {
  events: MatchEvent[];
  rosters: TeamRoster[];
  players: Record<string, EventPlayer>;
}) {
  const actions = useMatchActions();
  const [target, setTarget] = useState<MatchEvent | null>(null);
  const [voidTarget, setVoidTarget] = useState<MatchEvent | null>(null);
  const [voiding, setVoiding] = useState(false);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 p-4">
      <p className="font-semibold">Corrigir marcação</p>
      {events.map((e) => (
        <div key={e.id} className="flex items-center justify-between text-sm">
          <span>
            <Badge variant="outline" className="mr-2">
              {scoringTypeLabel[e.type] ?? e.type}
            </Badge>
            {e.event_player_id ? players[e.event_player_id]?.name : "?"}
          </span>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setTarget(e)}>
              Corrigir
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-apito-red"
              onClick={() => setVoidTarget(e)}
            >
              Anular
            </Button>
          </div>
        </div>
      ))}

      <PlayerActionDialog
        open={target != null}
        onOpenChange={(o) => !o && setTarget(null)}
        title="Corrigir pra quem?"
        rosters={rosters}
        confirmLabel="Salvar correção"
        onConfirm={async ({ teamId, playerId }) => {
          if (!target) return;
          await actions.voidAndCorrect(target.id, target.clock_ms, {
            type: target.type,
            teamId,
            playerId,
          });
        }}
      />

      <AlertDialog
        open={voidTarget != null}
        onOpenChange={(o) => !o && setVoidTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anular esse gol?</AlertDialogTitle>
            <AlertDialogDescription>
              {voidTarget?.event_player_id
                ? players[voidTarget.event_player_id]?.name
                : "Esse lance"}{" "}
              sai do placar e da artilharia. Fica registrado como anulado, dá
              pra conferir depois — não é apagado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={voiding}
              onClick={async () => {
                if (!voidTarget) return;
                setVoiding(true);
                await actions.voidEvent(voidTarget.id, voidTarget.clock_ms);
                setVoiding(false);
                setVoidTarget(null);
              }}
            >
              {voiding ? "Anulando..." : "Anular"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

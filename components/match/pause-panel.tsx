"use client";

import { useMemo, useState } from "react";
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
import { PlayCircle, UserPlus, Wrench } from "lucide-react";
import { useMatchStore } from "@/components/match/match-store-provider";
import { useMatchActions } from "@/hooks/use-match-actions";
import { PlayerActionDialog, type TeamRoster } from "@/components/match/player-action-dialog";
import type { EventPlayer, MatchEvent, MatchLineup } from "@/types/database";

const scoringTypeLabel: Record<string, string> = {
  goal: "Gol",
  own_goal: "Gol contra",
  penalty_goal: "Pênalti",
};

/** Bench players (own reserves) and active players borrowed from a team
 * that isn't on the court right now — the two pools offered whenever the
 * operator needs to put someone new into a team's lineup. */
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

export function PausePanel() {
  const homeTeam = useMatchStore((s) => s.homeTeam);
  const awayTeam = useMatchStore((s) => s.awayTeam);
  const lineups = useMatchStore((s) => s.lineups);
  const players = useMatchStore((s) => s.players);
  const allPlayers = useMatchStore((s) => s.allPlayers);
  const allTeams = useMatchStore((s) => s.allTeams);
  const teamAssignments = useMatchStore((s) => s.teamAssignments);
  const events = useMatchStore((s) => s.events);
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

  const teamNameById = useMemo(
    () => Object.fromEntries(allTeams.map((t) => [t.id, t.name])),
    [allTeams],
  );

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
      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={() => actions.resume()}
      >
        <PlayCircle className="h-5 w-5" />
        Bola rolando
      </Button>

      <RosterOverview
        rosters={rosters}
        teamAssignments={teamAssignments}
        teamNameById={teamNameById}
      />

      <AddPlayerSection
        rosters={rosters}
        allPlayers={allPlayers}
        lineups={lineups}
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

      <div className="rounded-2xl border border-white/10 p-4">
        <Button
          type="button"
          variant="destructive"
          className="w-full"
          onClick={() => actions.finish()}
        >
          Apitar fim
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Encerra essa partida e mostra a sugestão da próxima.
        </p>
      </div>
    </div>
  );
}

function RosterOverview({
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
          {roster
            .filter(
              (p) => teamAssignments[p.id] && teamAssignments[p.id] !== team.id,
            )
            .map((p) => (
              <p key={p.id} className="text-xs text-muted-foreground">
                {p.name}{" "}
                <span className="text-apito-yellow">
                  (emprestado de {teamNameById[teamAssignments[p.id]] ?? "outro time"})
                </span>
              </p>
            ))}
        </div>
      ))}
    </div>
  );
}

function AddPlayerSection({
  rosters,
  allPlayers,
  lineups,
  teamAssignments,
  teamNameById,
}: {
  rosters: TeamRoster[];
  allPlayers: import("@/types/database").EventPlayer[];
  lineups: import("@/types/database").MatchLineup[];
  teamAssignments: Record<string, string>;
  teamNameById: Record<string, string>;
}) {
  const actions = useMatchActions();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const matchTeamIds = new Set(rosters.map((r) => r.team.id));
  const { bench, otherTeamPlayers } = getSubstitutePools(
    allPlayers,
    lineups,
    matchTeamIds,
    teamAssignments,
  );

  if (bench.length === 0 && otherTeamPlayers.length === 0) return null;

  async function submit() {
    if (!teamId || !playerId) return;
    setPending(true);
    await actions.addPlayerToLineup({ teamId, playerId });
    setPending(false);
    setTeamId(null);
    setPlayerId(null);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 p-4">
      <p className="flex items-center gap-2 font-semibold">
        <UserPlus className="h-4 w-4 text-apito-yellow" />
        Completar time
      </p>
      <p className="text-xs text-muted-foreground">
        Time começou (ou continua) desfalcado — bota mais alguém em campo, sem
        precisar de lesão pra isso.
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

      {teamId && (
        <Select value={playerId ?? undefined} onValueChange={setPlayerId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Jogador">
              {(id: string | null) =>
                [...bench, ...otherTeamPlayers].find((p) => p.id === id)?.name ??
                "Jogador"
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

      {teamId && (
        <Button type="button" size="sm" disabled={pending || !playerId} onClick={submit}>
          {pending ? "Salvando..." : "Confirmar"}
        </Button>
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
  allPlayers: import("@/types/database").EventPlayer[];
  lineups: import("@/types/database").MatchLineup[];
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
  players: Record<string, import("@/types/database").EventPlayer>;
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

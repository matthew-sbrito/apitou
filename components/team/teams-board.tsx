"use client";

import { setTeamRoster } from "@/app/(app)/events/[id]/teams/actions";
import { TeamCard, type PlayerStat } from "@/components/team/team-card";
import type { EventPlayer, EventTeam } from "@/types/database";
import { useOptimistic, useTransition } from "react";

type RosterAction =
  | { type: "add"; teamId: string; playerId: string }
  | { type: "remove"; teamId: string; playerId: string };

function rosterReducer(
  state: Record<string, string[]>,
  action: RosterAction,
): Record<string, string[]> {
  if (action.type === "remove") {
    return {
      ...state,
      [action.teamId]: (state[action.teamId] ?? []).filter(
        (id) => id !== action.playerId,
      ),
    };
  }

  // Adding to a team pulls the player off any other team they're on —
  // mirrors what `setTeamRoster` does server-side.
  const next: Record<string, string[]> = {};
  for (const [teamId, ids] of Object.entries(state)) {
    next[teamId] = ids.filter((id) => id !== action.playerId);
  }
  next[action.teamId] = [...(next[action.teamId] ?? []), action.playerId];
  return next;
}

export function TeamsBoard({
  eventId,
  teams,
  allPlayers,
  initialRosterIdsByTeam,
  stats,
  readOnly,
}: {
  eventId: string;
  teams: EventTeam[];
  allPlayers: EventPlayer[];
  initialRosterIdsByTeam: Record<string, string[]>;
  stats: Record<string, PlayerStat>;
  readOnly: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [rosterIdsByTeam, dispatchRoster] = useOptimistic(
    initialRosterIdsByTeam,
    rosterReducer,
  );

  const playerTeamName: Record<string, string> = {};
  for (const team of teams) {
    for (const playerId of rosterIdsByTeam[team.id] ?? []) {
      playerTeamName[playerId] = team.name;
    }
  }

  function handleAddPlayer(teamId: string, playerId: string) {
    startTransition(async () => {
      dispatchRoster({ type: "add", teamId, playerId });
      const nextIds = [...(rosterIdsByTeam[teamId] ?? []), playerId];
      await setTeamRoster(eventId, teamId, nextIds);
    });
  }

  function handleRemovePlayer(teamId: string, playerId: string) {
    startTransition(async () => {
      dispatchRoster({ type: "remove", teamId, playerId });
      const nextIds = (rosterIdsByTeam[teamId] ?? []).filter(
        (id) => id !== playerId,
      );
      await setTeamRoster(eventId, teamId, nextIds);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {teams.map((team, index) => {
        const rosterIds = new Set(rosterIdsByTeam[team.id] ?? []);
        return (
          <TeamCard
            key={team.id}
            eventId={eventId}
            team={team}
            roster={allPlayers.filter((p) => rosterIds.has(p.id))}
            otherPlayers={allPlayers.filter(
              (p) => !rosterIds.has(p.id) && p.status === "active",
            )}
            playerTeamName={playerTeamName}
            stats={stats}
            canMoveUp={index > 0}
            canMoveDown={index < teams.length - 1}
            readOnly={readOnly}
            pending={pending}
            onAddPlayer={(playerId) => handleAddPlayer(team.id, playerId)}
            onRemovePlayer={(playerId) => handleRemovePlayer(team.id, playerId)}
          />
        );
      })}
    </div>
  );
}

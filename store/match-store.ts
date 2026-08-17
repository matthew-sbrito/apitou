import { createStore } from "zustand/vanilla";
import type { EventPlayer, EventTeam, Match, MatchEvent, MatchLineup } from "@/types/database";

export type MatchStoreState = {
  match: Match;
  events: MatchEvent[];
  homeTeam: EventTeam;
  awayTeam: EventTeam;
  lineups: MatchLineup[];
  players: Record<string, EventPlayer>;
  /** Every player in the event, including subs not on this match's lineup. */
  allPlayers: EventPlayer[];
  /** Every team in the event, not just this match's home/away. */
  allTeams: EventTeam[];
  /** Each player's persistent team for the event (event_player_id -> event_team_id). */
  teamAssignments: Record<string, string>;
  clockOffset: number;
};

export type MatchStoreActions = {
  setMatch: (patch: Partial<Match>) => void;
  addEvent: (event: MatchEvent) => void;
  setPlayerStatus: (playerId: string, status: EventPlayer["status"]) => void;
  addLineup: (lineup: MatchLineup) => void;
  setClockOffset: (offsetMs: number) => void;
};

export type MatchStore = MatchStoreState & MatchStoreActions;

export function createMatchStore(initial: MatchStoreState) {
  return createStore<MatchStore>()((set) => ({
    ...initial,
    setMatch: (patch) =>
      set((state) => ({ match: { ...state.match, ...patch } })),
    addEvent: (event) =>
      set((state) => ({ events: [...state.events, event] })),
    setPlayerStatus: (playerId, status) =>
      set((state) => ({
        players: {
          ...state.players,
          [playerId]: { ...state.players[playerId], status },
        },
        allPlayers: state.allPlayers.map((p) =>
          p.id === playerId ? { ...p, status } : p,
        ),
      })),
    addLineup: (lineup) =>
      set((state) => ({
        lineups: [...state.lineups, lineup],
        players: state.allPlayers.find((p) => p.id === lineup.event_player_id)
          ? {
              ...state.players,
              [lineup.event_player_id]: state.allPlayers.find(
                (p) => p.id === lineup.event_player_id,
              )!,
            }
          : state.players,
      })),
    setClockOffset: (offsetMs) => set({ clockOffset: offsetMs }),
  }));
}

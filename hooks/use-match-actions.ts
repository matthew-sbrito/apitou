"use client";

import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { appendEvent } from "@/lib/match-events";
import { computeElapsed } from "@/lib/clock";
import { useMatchStore } from "@/components/match/match-store-provider";
import { queueMatchPatch } from "@/lib/offline/match-patch-queue";
import type { MatchEventReason, MatchEventType, PlayerStatus } from "@/types/database";

export function useMatchActions() {
  const store = useMatchStore((s) => s);

  const elapsedNow = useCallback(() => {
    const serverNow = Date.now() + store.clockOffset;
    return computeElapsed(store.match, serverNow);
  }, [store.match, store.clockOffset]);

  const record = useCallback(
    async (
      type: MatchEventType,
      opts: {
        teamId?: string | null;
        playerId?: string | null;
        relatedPlayerId?: string | null;
        suspensionMs?: number | null;
        reason?: MatchEventReason | null;
        voidedEventId?: string | null;
        clockMs?: number;
        note?: string | null;
      } = {},
    ) => {
      const supabase = createClient();
      const event = await appendEvent(supabase, {
        match_id: store.match.id,
        type,
        clock_ms: opts.clockMs ?? elapsedNow(),
        event_team_id: opts.teamId ?? null,
        event_player_id: opts.playerId ?? null,
        related_player_id: opts.relatedPlayerId ?? null,
        suspension_ms: opts.suspensionMs ?? null,
        reason: opts.reason ?? null,
        voided_event_id: opts.voidedEventId ?? null,
        note: opts.note ?? null,
      });
      store.addEvent(event);
      return event;
    },
    [store, elapsedNow],
  );

  const updateMatchRow = useCallback(
    async (patch: Parameters<typeof store.setMatch>[0]) => {
      store.setMatch(patch);
      // Applied to local state immediately either way (above) — the write
      // below is the durable half. If it fails (offline, timeout), queue
      // the patch (keyed by match id, last-write-wins) for the sync worker
      // instead of losing it silently.
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("matches")
          .update(patch)
          .eq("id", store.match.id);
        if (error) await queueMatchPatch(store.match.id, patch);
      } catch {
        await queueMatchPatch(store.match.id, patch);
      }
    },
    [store],
  );

  const start = useCallback(async () => {
    await updateMatchRow({
      status: "running",
      started_at: new Date().toISOString(),
      accumulated_ms: 0,
    });
  }, [updateMatchRow]);

  const pause = useCallback(
    async (reason: MatchEventReason, note?: string) => {
      const elapsed = elapsedNow();
      await record("pause", { reason, clockMs: elapsed, note });
      await updateMatchRow({
        status: "paused",
        accumulated_ms: elapsed,
        started_at: null,
      });
    },
    [elapsedNow, record, updateMatchRow],
  );

  const resume = useCallback(async () => {
    await record("resume", { clockMs: store.match.accumulated_ms });
    await updateMatchRow({
      status: "running",
      started_at: new Date().toISOString(),
    });
  }, [record, updateMatchRow, store.match.accumulated_ms]);

  const finish = useCallback(async () => {
    const elapsed = elapsedNow();
    await updateMatchRow({
      status: "finished",
      accumulated_ms: elapsed,
      started_at: null,
      finished_at: new Date().toISOString(),
    });
  }, [elapsedNow, updateMatchRow]);

  const recordGoal = useCallback(
    async (opts: {
      teamId: string;
      playerId: string;
      type: "goal" | "own_goal" | "penalty_goal";
      assistPlayerId?: string;
    }) => {
      const clockMs = elapsedNow();
      const goalEvent = await record(opts.type, {
        teamId: opts.teamId,
        playerId: opts.playerId,
        clockMs,
      });
      if (opts.type === "goal" && opts.assistPlayerId) {
        await record("assist", {
          teamId: opts.teamId,
          playerId: opts.assistPlayerId,
          relatedPlayerId: opts.playerId,
          clockMs,
        });
      }
      return goalEvent;
    },
    [elapsedNow, record],
  );

  const recordFoul = useCallback(
    (teamId: string, playerId: string) => record("foul", { teamId, playerId }),
    [record],
  );

  const recordCard = useCallback(
    (
      teamId: string,
      playerId: string,
      card: "yellow_card" | "red_card" | "blue_card",
    ) => record(card, { teamId, playerId }),
    [record],
  );

  const recordSuspension = useCallback(
    (teamId: string, playerId: string, suspensionMs: number) =>
      record("suspension", { teamId, playerId, suspensionMs }),
    [record],
  );

  const setPlayerStatus = useCallback(
    async (playerId: string, status: PlayerStatus) => {
      store.setPlayerStatus(playerId, status);
      const supabase = createClient();
      await supabase.from("event_players").update({ status }).eq("id", playerId);
    },
    [store],
  );

  const recordInjury = useCallback(
    async (opts: {
      teamId: string;
      playerId: string;
      subInPlayerId?: string;
      markUnavailable?: boolean;
    }) => {
      const clockMs = elapsedNow();
      await record("injury", { teamId: opts.teamId, playerId: opts.playerId, clockMs });

      if (opts.subInPlayerId) {
        await record("sub_out", { teamId: opts.teamId, playerId: opts.playerId, clockMs });
        await record("sub_in", {
          teamId: opts.teamId,
          playerId: opts.subInPlayerId,
          relatedPlayerId: opts.playerId,
          clockMs,
          reason: "substitution",
        });

        const outgoing = store.lineups.find(
          (l) => l.event_player_id === opts.playerId,
        );
        const supabase = createClient();
        const { data: newLineup } = await supabase
          .from("match_lineups")
          .insert({
            match_id: store.match.id,
            event_team_id: opts.teamId,
            event_player_id: opts.subInPlayerId,
            role: outgoing?.role ?? "line",
          })
          .select("*")
          .single();
        if (newLineup) store.addLineup(newLineup);
      }

      if (opts.markUnavailable) {
        await setPlayerStatus(opts.playerId, "injured");
      }
    },
    [elapsedNow, record, setPlayerStatus, store],
  );

  /** Adds a player to a team's current lineup with no departing player and
   * no injury — for when a team simply starts/continues short-handed and
   * needs to fill the gap (bench player or one borrowed from a team that
   * isn't playing right now), as opposed to `recordInjury`'s "someone got
   * hurt" flow. */
  const addPlayerToLineup = useCallback(
    async (opts: { teamId: string; playerId: string; role?: "line" | "gk" }) => {
      const clockMs = elapsedNow();
      await record("sub_in", { teamId: opts.teamId, playerId: opts.playerId, clockMs });

      const supabase = createClient();
      const { data: newLineup } = await supabase
        .from("match_lineups")
        .insert({
          match_id: store.match.id,
          event_team_id: opts.teamId,
          event_player_id: opts.playerId,
          role: opts.role ?? "line",
        })
        .select("*")
        .single();
      if (newLineup) store.addLineup(newLineup);
    },
    [elapsedNow, record, store],
  );

  const voidAndCorrect = useCallback(
    async (
      originalEventId: string,
      originalClockMs: number,
      correction: { type: MatchEventType; teamId?: string; playerId?: string },
    ) => {
      await record("void", {
        voidedEventId: originalEventId,
        reason: "correction",
        clockMs: originalClockMs,
      });
      await record(correction.type, {
        teamId: correction.teamId,
        playerId: correction.playerId,
        clockMs: originalClockMs,
      });
    },
    [record],
  );

  /** Void with no replacement event — for a marking that shouldn't have
   * happened at all, as opposed to `voidAndCorrect`'s "happened, but wrong
   * player/team". Never deletes the original row (PLAN.md §3), just points a
   * `void` event at it; `valid_match_events` filters it out everywhere. */
  const voidEvent = useCallback(
    (originalEventId: string, originalClockMs: number) =>
      record("void", {
        voidedEventId: originalEventId,
        reason: "correction",
        clockMs: originalClockMs,
      }),
    [record],
  );

  return {
    start,
    pause,
    resume,
    finish,
    recordGoal,
    recordFoul,
    recordCard,
    recordSuspension,
    recordInjury,
    addPlayerToLineup,
    voidAndCorrect,
    voidEvent,
    setPlayerStatus,
  };
}

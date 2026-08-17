import { entries, del, get, set } from "idb-keyval";
import type { Match } from "@/types/database";
import { createSharedStore } from "./db";

export type MatchPatch = Partial<
  Pick<Match, "status" | "accumulated_ms" | "started_at" | "finished_at">
>;

const store = createSharedStore("match-patches");

/**
 * Keyed by matchId, last-write-wins. Unlike match_events (append-only log,
 * one entry per id), a matches-row patch just wants "the latest desired
 * state" — replaying every intermediate pause/resume while offline would be
 * wasted work, only the final state matters once connectivity returns.
 */
export async function queueMatchPatch(matchId: string, patch: MatchPatch): Promise<void> {
  const existing = (await get<MatchPatch>(matchId, store)) ?? {};
  await set(matchId, { ...existing, ...patch }, store);
}

export async function removeMatchPatch(matchId: string): Promise<void> {
  await del(matchId, store);
}

export async function listMatchPatches(): Promise<Array<[string, MatchPatch]>> {
  return entries<string, MatchPatch>(store);
}

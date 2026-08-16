import { createStore, entries, del, set } from "idb-keyval";
import type { MatchEvent } from "@/types/database";

export type PendingMatchEvent = Partial<MatchEvent> &
  Pick<MatchEvent, "id" | "match_id" | "type" | "clock_ms">;

const store = createStore("apitou-offline", "match-events");

export async function enqueuePendingEvent(event: PendingMatchEvent): Promise<void> {
  await set(event.id, event, store);
}

export async function removePendingEvent(id: string): Promise<void> {
  await del(id, store);
}

export async function listPendingEvents(): Promise<PendingMatchEvent[]> {
  const all = await entries<string, PendingMatchEvent>(store);
  return all.map(([, value]) => value);
}

export async function countPendingEvents(): Promise<number> {
  const all = await listPendingEvents();
  return all.length;
}

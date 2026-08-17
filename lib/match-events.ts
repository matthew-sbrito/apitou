import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MatchEvent, MatchEventReason, MatchEventType } from "@/types/database";
import { enqueuePendingEvent } from "@/lib/offline/queue";

export type NewMatchEvent = {
  match_id: string;
  type: MatchEventType;
  clock_ms: number;
  event_team_id?: string | null;
  event_player_id?: string | null;
  related_player_id?: string | null;
  suspension_ms?: number | null;
  reason?: MatchEventReason | null;
  voided_event_id?: string | null;
  note?: string | null;
};

/**
 * Writes a match_events row straight from the browser (PLAN.md §10 —
 * offline-first: the match screen can't depend on a round trip to a Server
 * Action). The event id is generated client-side so the write is idempotent
 * — a retry (from the sync worker) or a duplicate tap just no-ops via
 * `on conflict (id) do nothing`. If the write fails outright (offline,
 * timeout), the event is queued in IndexedDB for the sync worker to retry.
 */
export async function appendEvent(
  supabase: SupabaseClient<Database>,
  event: NewMatchEvent,
): Promise<MatchEvent> {
  const row: MatchEvent = {
    id: crypto.randomUUID(),
    event_team_id: null,
    event_player_id: null,
    related_player_id: null,
    suspension_ms: null,
    reason: null,
    voided_event_id: null,
    note: null,
    created_by: null,
    created_at: new Date().toISOString(),
    ...event,
    clock_ms: Math.round(event.clock_ms),
  };

  try {
    const { error } = await supabase
      .from("match_events")
      .upsert(row, { onConflict: "id", ignoreDuplicates: true });

    if (error) {
      await enqueuePendingEvent(row);
    }
  } catch {
    await enqueuePendingEvent(row);
  }

  return row;
}

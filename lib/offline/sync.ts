import { createClient } from "@/lib/supabase/client";
import { listPendingEvents, removePendingEvent } from "@/lib/offline/queue";
import { listMatchPatches, removeMatchPatch } from "@/lib/offline/match-patch-queue";

export type SyncStatus = { pending: number; syncing: boolean };
export type SyncListener = (status: SyncStatus) => void;

let listeners: SyncListener[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;

const BASE_BACKOFF_MS = 3000;
const MAX_BACKOFF_MS = 60_000;
let backoffMs = BASE_BACKOFF_MS;

export function onSyncStatusChange(listener: SyncListener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

async function notify(syncing: boolean) {
  const [events, patches] = await Promise.all([listPendingEvents(), listMatchPatches()]);
  const status: SyncStatus = { pending: events.length + patches.length, syncing };
  listeners.forEach((l) => l(status));
}

/** Flushes every queued match_event and matches-row patch. Both are
 * idempotent (event upsert on conflict id do nothing; patch is a plain
 * "set this state" update), so a partial flush that gets interrupted is
 * safe to retry from scratch. */
export async function flushPending(): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await notify(false);
    return false;
  }

  await notify(true);
  const supabase = createClient();
  let allOk = true;

  for (const event of await listPendingEvents()) {
    const { error } = await supabase
      .from("match_events")
      .upsert(event, { onConflict: "id", ignoreDuplicates: true });
    if (!error) await removePendingEvent(event.id);
    else allOk = false;
  }

  for (const [matchId, patch] of await listMatchPatches()) {
    const { error } = await supabase.from("matches").update(patch).eq("id", matchId);
    if (!error) await removeMatchPatch(matchId);
    else allOk = false;
  }

  await notify(false);
  return allOk;
}

function scheduleNext(ok: boolean) {
  backoffMs = ok ? BASE_BACKOFF_MS : Math.min(backoffMs * 2, MAX_BACKOFF_MS);
  timer = setTimeout(loop, backoffMs);
}

async function loop() {
  const ok = await flushPending();
  scheduleNext(ok);
}

/** Idempotent — safe to call from every mounted component that wants sync
 * running; only the first call actually starts the loop. */
export function startSyncLoop() {
  if (started || typeof window === "undefined") return;
  started = true;

  loop();

  window.addEventListener("online", () => {
    backoffMs = BASE_BACKOFF_MS;
    if (timer) clearTimeout(timer);
    loop();
  });
  window.addEventListener("offline", () => {
    notify(false);
  });
}

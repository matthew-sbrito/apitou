"use client";

import { useEffect, useState } from "react";
import { onSyncStatusChange, startSyncLoop, type SyncStatus } from "@/lib/offline/sync";

export function useSyncStatus(): SyncStatus & { online: boolean } {
  const [status, setStatus] = useState<SyncStatus>({ pending: 0, syncing: false });
  // Always starts `true` — Node 21+ ships a global `navigator` object (for
  // `navigator.userAgent`) with no `onLine` property, so checking it during
  // SSR reads as `undefined`/falsy while the real browser reads `true`,
  // producing a hydration mismatch. The real value is only knowable
  // client-side anyway, so it's corrected in the effect below instead.
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // Deferred to the next frame rather than called synchronously in the
    // effect body, per the same rule `use-match-clock.ts` works around.
    const raf = requestAnimationFrame(() => setOnline(navigator.onLine));
    startSyncLoop();

    const unsubscribe = onSyncStatusChange(setStatus);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      cancelAnimationFrame(raf);
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { ...status, online };
}

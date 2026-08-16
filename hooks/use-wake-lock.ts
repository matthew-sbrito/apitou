"use client";

import { useEffect } from "react";

/** Keeps the screen on while the match is running (PLAN.md §16 checklist). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      return;
    }

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    navigator.wakeLock
      .request("screen")
      .then((lock) => {
        if (cancelled) {
          lock.release();
          return;
        }
        sentinel = lock;
      })
      .catch(() => {
        // Wake lock isn't guaranteed (denied, unsupported, tab not visible) —
        // failing silently is fine, it's a nice-to-have, not the source of truth.
      });

    return () => {
      cancelled = true;
      sentinel?.release();
    };
  }, [active]);
}

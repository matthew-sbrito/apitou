"use client";

import { useEffect } from "react";

export function SessionKeeper() {
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      if (document.visibilityState === "visible") {
        fetch("/api/auth/refresh", {
          method: "POST",
          signal: controller.signal,
        }).catch(() => {});
      }
    };
    refresh();
    document.addEventListener("visibilitychange", refresh);
    const id = setInterval(refresh, 30 * 60 * 1000);
    return () => {
      // Aborts any in-flight refresh so its response (and the session
      // cookie it would set) can't land after a logout that happened
      // while this request was still pending — otherwise the refresh's
      // Set-Cookie can arrive after logout's and silently resurrect the
      // just-cleared session, bouncing the user between /login and
      // /events on their next navigation.
      controller.abort();
      document.removeEventListener("visibilitychange", refresh);
      clearInterval(id);
    };
  }, []);
  return null;
}

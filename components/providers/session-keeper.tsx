"use client";

import { useEffect } from "react";

export function SessionKeeper() {
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        fetch("/api/auth/refresh", { method: "POST" }).catch(() => {});
      }
    };
    refresh();
    document.addEventListener("visibilitychange", refresh);
    const id = setInterval(refresh, 30 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      clearInterval(id);
    };
  }, []);
  return null;
}

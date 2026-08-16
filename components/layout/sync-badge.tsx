"use client";

import { useSyncStatus } from "@/hooks/use-sync-status";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";

export function SyncBadge() {
  const { pending, online } = useSyncStatus();

  if (!online) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <WifiOff className="h-3.5 w-3.5" />
        Offline
      </span>
    );
  }

  if (pending > 0) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-apito-yellow">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        {pending} pendente{pending > 1 ? "s" : ""}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-xs text-apito-green">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Sincronizado
    </span>
  );
}

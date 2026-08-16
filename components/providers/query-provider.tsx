"use client";

import { useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";

/**
 * Wired app-wide per PLAN.md §2 ("TanStack Query com persistência em
 * IndexedDB"), so any future client-side data hook gets an offline-capable
 * cache for free. Today's CRUD pages are React Server Components (fresh
 * data straight from Supabase on every navigation, no client cache needed);
 * the truly offline-critical writes — match events, matches-row patches —
 * go through the dedicated queues in lib/offline/, not through this cache.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, gcTime: 24 * 60 * 60 * 1000 },
        },
      }),
  );

  const [persister] = useState(() =>
    createAsyncStoragePersister({
      key: "apitou-query-cache",
      storage: {
        getItem: (key: string) => get(key),
        setItem: (key: string, value: string) => set(key, value),
        removeItem: (key: string) => del(key),
      },
    }),
  );

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      {children}
    </PersistQueryClientProvider>
  );
}

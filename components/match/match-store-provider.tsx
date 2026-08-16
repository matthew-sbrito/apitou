"use client";

import { createContext, useContext, useState } from "react";
import { useStore } from "zustand";
import { createMatchStore, type MatchStore, type MatchStoreState } from "@/store/match-store";

type StoreApi = ReturnType<typeof createMatchStore>;

const MatchStoreContext = createContext<StoreApi | null>(null);

export function MatchStoreProvider({
  initial,
  children,
}: {
  initial: MatchStoreState;
  children: React.ReactNode;
}) {
  const [store] = useState<StoreApi>(() => createMatchStore(initial));

  return (
    <MatchStoreContext.Provider value={store}>
      {children}
    </MatchStoreContext.Provider>
  );
}

export function useMatchStore<T>(selector: (state: MatchStore) => T): T {
  const store = useContext(MatchStoreContext);
  if (!store) throw new Error("useMatchStore must be used inside MatchStoreProvider");
  return useStore(store, selector);
}

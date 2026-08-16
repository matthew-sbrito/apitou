"use client";

import { usePathname } from "next/navigation";
import { isMatchRoute } from "@/lib/is-match-route";

export function AppHeaderGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return isMatchRoute(pathname) ? null : <>{children}</>;
}

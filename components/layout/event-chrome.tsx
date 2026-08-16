"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/layout/bottom-nav";
import { isMatchRoute } from "@/lib/is-match-route";

export function EventChrome({
  eventId,
  children,
}: {
  eventId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showNav = !isMatchRoute(pathname);

  return (
    <>
      <div
        className={
          showNav
            ? "pb-[calc(var(--bottom-nav-height)+var(--safe-bottom))]"
            : undefined
        }
      >
        {children}
      </div>
      {showNav && <BottomNav eventId={eventId} />}
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function EventNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/events/${eventId}`;

  const tabs = [
    { href: base, label: "Visão geral" },
    { href: `${base}/players`, label: "Jogadores" },
    { href: `${base}/teams`, label: "Banco" },
    { href: `${base}/matches`, label: "Partidas" },
    { href: `${base}/summary`, label: "Súmula" },
  ];

  // The match screen stays chrome-free on purpose (PLAN.md §1) — no tabs.
  if (pathname.includes("/match/")) return null;

  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-card p-1">
      {tabs.map((tab) => {
        const active =
          tab.href === base ? pathname === base : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "text-apito-black" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.div
                layoutId="event-nav-active-pill"
                className="absolute inset-0 rounded-lg bg-apito-yellow"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

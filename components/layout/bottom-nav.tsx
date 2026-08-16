"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  Users,
  Shirt,
  Swords,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isMatchRoute } from "@/lib/is-match-route";

const TABS = [
  { suffix: "", label: "Visão geral", icon: LayoutDashboard },
  { suffix: "/players", label: "Jogadores", icon: Users },
  { suffix: "/teams", label: "Banco", icon: Shirt },
  { suffix: "/matches", label: "Partidas", icon: Swords },
  { suffix: "/summary", label: "Súmula", icon: ScrollText },
];

export function BottomNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/events/${eventId}`;

  if (isMatchRoute(pathname)) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-apito-black/85 backdrop-blur-md"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <div className="mx-auto flex w-full max-w-4xl">
        {TABS.map((tab) => {
          const href = `${base}${tab.suffix}`;
          const active =
            tab.suffix === "" ? pathname === base : pathname.startsWith(href);
          const Icon = tab.icon;

          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center gap-1 py-2.5"
            >
              {active && (
                <motion.div
                  layoutId="bottom-nav-active-indicator"
                  className="absolute inset-x-3 top-0 h-[3px] rounded-full bg-apito-yellow shadow-glow-sm"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <motion.div whileTap={{ scale: 0.92 }}>
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform",
                    active ? "scale-110 text-apito-yellow" : "text-muted-foreground",
                  )}
                />
              </motion.div>
              <span
                className={cn(
                  "font-heading text-[0.65rem] font-medium tracking-wide",
                  active ? "text-apito-yellow" : "text-muted-foreground",
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

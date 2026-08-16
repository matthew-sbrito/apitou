"use client";

import { useMatchStore } from "@/components/match/match-store-provider";
import { computeLiveScore } from "@/lib/live-score";
import { AnimatePresence, motion } from "motion/react";

export function ScoreBoard() {
  const events = useMatchStore((s) => s.events);
  const homeTeam = useMatchStore((s) => s.homeTeam);
  const awayTeam = useMatchStore((s) => s.awayTeam);

  const { homeGoals, awayGoals } = computeLiveScore(
    events,
    homeTeam.id,
    awayTeam.id,
  );
  const score = `${homeGoals}-${awayGoals}`;

  return (
    <div className="flex items-center justify-between rounded-2xl bg-card px-5 py-4 gap-2">
      <TeamLabel name={homeTeam.name} color={homeTeam.color} />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={score}
          initial={{ scale: 1.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
          className="text-4xl font-black tabular-nums text-apito-yellow"
        >
          {homeGoals} x {awayGoals}
        </motion.span>
      </AnimatePresence>
      <TeamLabel name={awayTeam.name} color={awayTeam.color} align="right" />
    </div>
  );
}

function TeamLabel({
  name,
  color,
  align = "left",
}: {
  name: string;
  color: string | null;
  align?: "left" | "right";
}) {
  return (
    <div
      className={`flex items-center gap-2 ${align === "right" ? "flex-row-reverse" : ""}`}
    >
      <span
        className="h-3 w-3 rounded-full"
        style={{ backgroundColor: color ?? "var(--apito-yellow)" }}
      />
      <span className="text-sm font-semibold">{name}</span>
    </div>
  );
}

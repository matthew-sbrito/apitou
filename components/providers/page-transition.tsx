"use client";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";

/**
 * Rendered from a template.tsx (currently app/(app)/events/[id]/template.tsx),
 * scoped below whatever layout renders persistent chrome (header, EventNav)
 * so only the actual page content animates. Next only remounts a template
 * when *its own* segment changes — navigating between deeper sibling routes
 * (e.g. .../players ↔ .../teams, same [id]) does NOT remount a template
 * declared at the [id] level, so `key={pathname}` still does the real work
 * of forcing a fresh, animatable mount on every navigation.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{ willChange: "transform, opacity" }}
      className="flex flex-1 flex-col"
    >
      {children}
    </motion.div>
  );
}

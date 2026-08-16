import { PageTransition } from "@/components/providers/page-transition";

/**
 * Sits between layout.tsx (which renders EventNav, above) and the page
 * content, so only the content animates on navigation between the event's
 * tabs — the nav bar and the app header stay put instead of resetting.
 */
export default function EventTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}

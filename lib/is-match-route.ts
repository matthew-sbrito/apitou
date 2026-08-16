// The live match screen stays chrome-free on purpose (PLAN.md §1) — no
// bottom nav, no app header. Shared so BottomNav, EventChrome, and
// AppHeaderGate can't drift out of sync on the definition.
export function isMatchRoute(pathname: string) {
  return pathname.includes("/match/");
}

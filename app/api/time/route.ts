import { NextResponse } from "next/server";

/**
 * Server clock offset endpoint (PLAN.md §6.2). Called once when a match
 * starts so the client can compute `clockOffset = serverTime - Date.now()`
 * and never trust the device's own clock for the match timer.
 */
export async function GET() {
  return NextResponse.json({ now: Date.now() });
}

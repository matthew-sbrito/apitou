import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Deliberately the deprecated `middleware.ts` convention, not Next.js 16's
// `proxy.ts` — proxy is hard-locked to the Node.js runtime (no way to opt
// out), and @opennextjs/cloudflare's Workers deployment only supports Edge
// Middleware, not Node.js middleware. middleware.ts is the one file
// convention Next.js 16 still runs on the Edge runtime.
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

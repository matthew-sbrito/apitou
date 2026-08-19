import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component with no request/response to
            // write cookies to. middleware.ts (lib/supabase/middleware.ts)
            // refreshes and persists the session cookie before any Server
            // Component renders, so getUser() here should normally find an
            // already-fresh token and never need to write one. This catch
            // just guards the residual gap: an access token expiring
            // between the middleware refresh and this render. Long-idle
            // tabs (no navigation to trigger middleware) are covered
            // separately by components/providers/session-keeper.tsx, which
            // pings app/api/auth/refresh/route.ts (a Route Handler, which
            // *can* persist cookies) on mount/visibility/interval.
          }
        },
      },
    },
  );
}

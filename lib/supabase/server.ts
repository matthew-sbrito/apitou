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
            // Called from a Server Component with no request/response to write
            // cookies to. There's no middleware on this deployment target to
            // refresh sessions on navigation (Cloudflare Workers can't run
            // Next.js 16's Node.js-runtime-only Proxy) — instead
            // components/providers/session-keeper.tsx pings
            // app/api/auth/refresh/route.ts (a Route Handler, which *can*
            // persist cookies) on mount/visibility/interval to keep the
            // session refreshed. This catch just guards the narrow gap that
            // remains: a Server Component render whose access token happens
            // to be expired before that refresh runs.
          }
        },
      },
    },
  );
}

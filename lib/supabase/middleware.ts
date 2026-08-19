import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

/**
 * Refreshes (and persists) the Supabase session cookie before the request
 * reaches any Server Component. Server Components can only *read* cookies —
 * a refreshed token triggered by `getUser()` there gets discarded, which is
 * what caused the /login <-> /events redirect loop (two independent
 * getUser() calls, one per layout, each racing to refresh the same
 * now-rotated refresh token). This runs once per request, before either
 * layout renders (invoked from the root middleware.ts — see the comment
 * there on why it's `middleware.ts` and not `proxy.ts`), so by the time
 * they call getUser() the cookie is already current and neither needs to
 * refresh anything itself.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  // Do not run code between createServerClient and getUser() — a stray
  // await here can reintroduce the same class of stale-cookie bug.
  await supabase.auth.getUser();

  return response;
}

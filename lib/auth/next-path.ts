const FALLBACK = "/events";

/**
 * Login/signup/callback all accept a `next` query param so a visitor
 * bounced to `/login` (e.g. from `.../join`) lands back where they started.
 * `next` comes straight from the URL, so it's untrusted — restrict it to an
 * internal path (`/foo`, never `//foo` or an absolute URL) to avoid an open
 * redirect.
 */
export function sanitizeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return FALLBACK;
  }

  return next;
}

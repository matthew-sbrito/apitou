import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * The link an owner shares (`.../events/[id]/join`). Visiting it while
 * logged in joins immediately — no approval step yet, see
 * docs/event-membership-approval.md for that follow-up.
 *
 * Always upserts, even for the owner visiting their own link: checking
 * "is this visitor the owner" first would need to `select` the event, but
 * RLS only allows that for the owner or an existing member — a brand new
 * joiner can't read it yet. A stray membership row for the owner is
 * harmless (every page gates owner-only UI on `event.owner_id ===
 * user.id`, never on event_members membership), so it's simpler to just
 * always join and let the FK constraint reject a bogus event id.
 */
export default async function JoinEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("event_members")
    .upsert(
      { event_id: eventId, user_id: user.id },
      { onConflict: "event_id,user_id", ignoreDuplicates: true },
    );

  if (error) {
    // 23503 = FK violation — the event id genuinely doesn't exist, a real
    // 404. Anything else (missing table, RLS misconfig, ...) is a setup
    // problem, not a bad link — log it server-side instead of leaking raw
    // Postgres error codes/messages to the client.
    if (error.code === "23503") notFound();

    console.error("[join] failed to upsert event_members", error);

    return (
      <div className="mx-auto flex max-w-sm flex-col gap-3 py-16 text-center">
        <h1 className="text-xl font-bold">Não rolou entrar no evento</h1>
        <p className="text-sm text-muted-foreground">
          Deu ruim aqui do nosso lado. Tenta de novo em instantes.
        </p>
      </div>
    );
  }

  redirect(`/events/${eventId}`);
}

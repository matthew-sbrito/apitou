"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { eventSchema, type EventInput } from "@/lib/validation/event";

export type EventFormState = { error: string } | undefined;

export async function updateEvent(
  eventId: string,
  values: EventInput,
): Promise<EventFormState> {
  // Defense in depth — react-hook-form + zodResolver already validated
  // this client-side before calling here.
  const parsed = eventSchema.safeParse(values);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Confere os dados aí." };
  }

  const { name, location, scheduled_at, team_size, has_goalkeeper } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("events")
    .update({
      name,
      location: location || null,
      scheduled_at: scheduled_at ? new Date(scheduled_at).toISOString() : null,
      team_size,
      has_goalkeeper,
    })
    .eq("id", eventId);

  if (error) {
    return { error: "Não rolou salvar as alterações. Tenta de novo." };
  }

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
}

/**
 * Manual "the pelada actually started" switch, independent of
 * `scheduled_at` (real life doesn't always start on the dot — PLAN.md
 * doesn't gate anything on this status today, but it's the visible signal
 * on the dashboard/events list badge) and independent of the first match
 * being created (`startFirstMatch` also flips this, for events where the
 * operator jumps straight to "Apitar início" without visiting this page).
 */
export async function startEvent(eventId: string) {
  const supabase = await createClient();
  await supabase.from("events").update({ status: "running" }).eq("id", eventId);
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/edit`);
}

/** A member leaving an event they joined — never used by the owner, who
 * has no `event_members` row to remove (their access comes from
 * `owner_id`, not membership). */
export async function leaveEvent(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase
    .from("event_members")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", user.id);

  redirect("/events");
}

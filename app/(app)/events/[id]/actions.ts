"use server";

import { createClient } from "@/lib/supabase/server";
import { eventSchema, type EventInput } from "@/lib/validation/event";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

  const {
    name,
    location,
    scheduled_at,
    team_size,
    has_goalkeeper,
    drawRule,
    maxReign,
    matchDurationMs,
    goalLimit,
  } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("events")
    .update({
      name,
      location: location || null,
      scheduled_at: scheduled_at ? new Date(scheduled_at).toISOString() : null,
      team_size,
      has_goalkeeper,
      rules: { drawRule, maxReign, matchDurationMs, goalLimit },
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

/** Owner-only, irreversible — every child row (players, teams, matches,
 * match_events) cascades via `on delete cascade` (supabase/migrations/
 * 0001_init.sql + 0005_cascade_deletes.sql), and RLS's owner `for all`
 * policy is what actually stops a non-owner from calling this directly. */
export async function deleteEvent(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("owner_id", user.id);

  if (error) {
    return { error: "Não rolou apagar o evento. Tenta de novo." };
  }

  redirect("/events");
}

/** Owner-only. Creates a new draft event with the same settings (name,
 * location, team_size, has_goalkeeper, rules) and copies the player
 * roster — but not scheduled_at (a clone is for a *future* pelada, the
 * operator picks a new date/time on the edit page) and not team
 * assignments (event_team_players / event_teams), since redrawing teams
 * is the normal next step for a brand-new event anyway. */
export async function cloneEvent(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: source, error: sourceError }, { data: players }] =
    await Promise.all([
      supabase
        .from("events")
        .select("name, location, team_size, has_goalkeeper, rules")
        .eq("id", eventId)
        .single(),
      supabase
        .from("event_players")
        .select("user_id, name, rating, is_goalkeeper, is_substitute")
        .eq("event_id", eventId),
    ]);

  if (sourceError || !source) {
    return { error: "Não rolou clonar o evento. Tenta de novo." };
  }

  const { data: clone, error: cloneError } = await supabase
    .from("events")
    .insert({
      owner_id: user.id,
      name: `${source.name} (cópia)`,
      location: source.location,
      team_size: source.team_size,
      has_goalkeeper: source.has_goalkeeper,
      rules: source.rules,
    })
    .select("id")
    .single();

  if (cloneError || !clone) {
    return { error: "Não rolou clonar o evento. Tenta de novo." };
  }

  if (players && players.length > 0) {
    await supabase.from("event_players").insert(
      players.map((p) => ({
        event_id: clone.id,
        user_id: p.user_id,
        name: p.name,
        rating: p.rating,
        is_goalkeeper: p.is_goalkeeper,
        is_substitute: p.is_substitute,
      })),
    );
  }

  redirect(`/events/${clone.id}`);
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

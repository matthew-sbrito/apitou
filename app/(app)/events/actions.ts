"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { eventSchema, type EventInput } from "@/lib/validation/event";

export type EventFormState = { error: string } | undefined;

export async function createEvent(values: EventInput): Promise<EventFormState> {
  // Defense in depth — react-hook-form + zodResolver already validated
  // this client-side before calling here.
  const parsed = eventSchema.safeParse(values);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Confere os dados aí." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { name, location, scheduled_at, team_size, has_goalkeeper } = parsed.data;

  const { data, error } = await supabase
    .from("events")
    .insert({
      owner_id: user.id,
      name,
      location: location || null,
      scheduled_at: scheduled_at
        ? new Date(scheduled_at).toISOString()
        : null,
      team_size,
      has_goalkeeper,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Não rolou criar o evento. Tenta de novo." };
  }

  redirect(`/events/${data.id}`);
}

export async function finishEvent(eventId: string) {
  const supabase = await createClient();
  await supabase.from("events").update({ status: "finished" }).eq("id", eventId);
  redirect(`/events/${eventId}/summary`);
}

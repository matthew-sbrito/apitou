"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { playerSchema, type PlayerInput } from "@/lib/validation/event";
import type { PlayerStatus } from "@/types/database";

export type PlayerFormState = { error: string } | undefined;

export async function addPlayer(
  eventId: string,
  values: PlayerInput,
): Promise<PlayerFormState> {
  // Defense in depth — react-hook-form + zodResolver already validated
  // this client-side before calling here.
  const parsed = playerSchema.safeParse(values);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Confere os dados aí." };
  }

  const supabase = await createClient();
  const { name, rating, is_goalkeeper, is_substitute } = parsed.data;

  const { error } = await supabase.from("event_players").insert({
    event_id: eventId,
    name,
    rating: rating ?? null,
    is_goalkeeper,
    is_substitute,
  });

  if (error) {
    return { error: "Não rolou adicionar o jogador. Tenta de novo." };
  }

  revalidatePath(`/events/${eventId}/players`);
}

export async function setPlayerStatus(
  eventId: string,
  playerId: string,
  status: PlayerStatus,
) {
  const supabase = await createClient();
  await supabase
    .from("event_players")
    .update({ status })
    .eq("id", playerId);

  revalidatePath(`/events/${eventId}/players`);
}

export async function removePlayer(eventId: string, playerId: string) {
  const supabase = await createClient();
  await supabase.from("event_players").delete().eq("id", playerId);
  revalidatePath(`/events/${eventId}/players`);
}

/** A member adding *themselves* to the roster — distinct from `addPlayer`
 * (owner-only, can add anyone). Only inserts a row for the caller's own
 * account; RLS's "members add themselves as players" policy enforces the
 * same constraint server-side. */
export async function joinAsPlayer(eventId: string): Promise<PlayerFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Faz login pra participar." };

  const name = (user.user_metadata?.name as string | undefined) ?? "Jogador";

  const { error } = await supabase.from("event_players").insert({
    event_id: eventId,
    user_id: user.id,
    name,
    is_goalkeeper: false,
    is_substitute: false,
  });

  if (error) {
    return { error: "Não rolou entrar na lista. Tenta de novo." };
  }

  revalidatePath(`/events/${eventId}/players`);
}

/** The counterpart to `joinAsPlayer` — a member removing their own row.
 * Not exposed for removing anyone else's (that stays `removePlayer`,
 * owner-only). */
export async function leaveAsPlayer(eventId: string, playerId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("event_players")
    .delete()
    .eq("id", playerId)
    .eq("user_id", user.id);

  revalidatePath(`/events/${eventId}/players`);
}

export async function updatePlayerRating(
  eventId: string,
  playerId: string,
  rating: number | null,
) {
  if (rating != null && (rating < 0 || rating > 10)) return;

  const supabase = await createClient();
  await supabase.from("event_players").update({ rating }).eq("id", playerId);
  revalidatePath(`/events/${eventId}/players`);
}

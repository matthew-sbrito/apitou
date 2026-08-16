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

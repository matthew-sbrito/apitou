"use server";

import { createClient } from "@/lib/supabase/server";
import {
  editPlayerSchema,
  playerSchema,
  type EditPlayerInput,
  type PlayerInput,
} from "@/lib/validation/event";
import type { PlayerStatus } from "@/types/database";
import { revalidatePath } from "next/cache";

export type PlayerFormState = { error: string; field?: "name" } | undefined;

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
    // 23505 = unique violation on event_players_event_id_name_key (0003
    // migration) — two players in the same event can't share a name.
    // `field: "name"` tells the form to surface this on the name input
    // itself instead of a generic banner, so it doubles as "edit the name
    // and try again".
    if (error.code === "23505") {
      return {
        error: "Já tem um jogador com esse nome nesse evento.",
        field: "name",
      };
    }
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
  await supabase.from("event_players").update({ status }).eq("id", playerId);

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
 * same constraint server-side.
 *
 * `overrideName` lets the caller retry with a different name after a
 * duplicate-name conflict (see `field: "name"` below) — the account's own
 * name (`user_metadata.name`) collides with an existing player about as
 * often as a walk-in add does, but there's no form here to edit inline, so
 * the caller re-invokes this with a chosen name instead. */
export async function joinAsPlayer(
  eventId: string,
  overrideName?: string,
): Promise<PlayerFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Faz login pra participar." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("custom_name, rating")
    .eq("user_id", user.id)
    .maybeSingle();

  const trimmedOverride = overrideName?.trim();
  const name =
    trimmedOverride ||
    profile?.custom_name ||
    (user.user_metadata?.name as string | undefined) ||
    "Jogador";

  const { error } = await supabase.from("event_players").insert({
    event_id: eventId,
    user_id: user.id,
    name,
    rating: profile?.rating ?? null,
    is_goalkeeper: false,
    is_substitute: false,
  });

  if (error) {
    // Same unique constraint as addPlayer — here it means someone else in
    // this event already has this name. `field: "name"` tells the button
    // to offer an inline name edit instead of just a toast.
    if (error.code === "23505") {
      return {
        error: "Já tem um jogador com esse nome nesse evento.",
        field: "name",
      };
    }
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

const RANDOM_PLAYER_NAME_POOL = [
  "Alan",
  "Bruno",
  "Caio",
  "Diego",
  "Eduardo",
  "Felipe",
  "Gustavo",
  "Hugo",
  "Igor",
  "Joao",
  "Kaio",
  "Lucas",
  "Marcos",
  "Nathan",
  "Otavio",
  "Pedro",
  "Rafael",
  "Samuel",
  "Thiago",
  "Vitor",
];

/** Dev-only convenience for populating a roster during local testing —
 * generates `count` throwaway players with random names/ratings so the
 * queue/team-draw flows can be exercised without typing each one in by
 * hand. Guarded server-side (not just by hiding the trigger UI) since
 * Server Actions are callable directly. */
export async function addRandomPlayers(eventId: string, count: number) {
  if (process.env.NODE_ENV !== "development") return;
  if (!Number.isInteger(count) || count < 1 || count > 30) return;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("event_players")
    .select("name")
    .eq("event_id", eventId);
  const usedNames = new Set((existing ?? []).map((p) => p.name));

  const rows = Array.from({ length: count }, () => {
    let name: string;
    do {
      const first =
        RANDOM_PLAYER_NAME_POOL[
          Math.floor(Math.random() * RANDOM_PLAYER_NAME_POOL.length)
        ];
      name = `${first} ${Math.floor(Math.random() * 1000)}`;
    } while (usedNames.has(name));
    usedNames.add(name);

    return {
      event_id: eventId,
      name,
      rating: Math.round(Math.random() * 20) / 2,
      is_goalkeeper: Math.random() < 0.15,
      is_substitute: Math.random() < 0.15,
    };
  });

  await supabase.from("event_players").insert(rows);
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

/** Backs the edit dialog — goalkeeper/substitute/status/rating all change
 * together from one form, unlike the single-field auto-save actions above. */
export async function updatePlayer(
  eventId: string,
  playerId: string,
  values: EditPlayerInput,
): Promise<PlayerFormState> {
  const parsed = editPlayerSchema.safeParse(values);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Confere os dados aí." };
  }

  const supabase = await createClient();
  const { rating, is_goalkeeper, is_substitute, status } = parsed.data;

  const { error } = await supabase
    .from("event_players")
    .update({ rating: rating ?? null, is_goalkeeper, is_substitute, status })
    .eq("id", playerId);

  if (error) {
    return { error: "Não rolou salvar. Tenta de novo." };
  }

  revalidatePath(`/events/${eventId}/players`);
}

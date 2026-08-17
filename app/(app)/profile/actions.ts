"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileSchema, type ProfileInput } from "@/lib/validation/profile";

export type ProfileFormState = { error: string } | undefined;

export async function updateProfile(
  values: ProfileInput,
): Promise<ProfileFormState> {
  // Defense in depth — react-hook-form + zodResolver already validated
  // this client-side before calling here.
  const parsed = profileSchema.safeParse(values);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Confere os dados aí." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Faz login de novo." };

  const { error } = await supabase.from("profiles").upsert({
    user_id: user.id,
    custom_name: parsed.data.custom_name,
    rating: parsed.data.rating ?? null,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: "Não rolou salvar. Tenta de novo." };

  revalidatePath("/profile");
}

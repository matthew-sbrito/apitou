"use server";

import { redirect } from "next/navigation";
import { sanitizeNextPath } from "@/lib/auth/next-path";
import { createClient } from "@/lib/supabase/server";
import { signupSchema, type SignupInput } from "@/lib/validation/auth";

export type SignupState = { error?: string; success?: boolean } | undefined;

export async function signup(
  values: SignupInput,
  next?: string,
): Promise<SignupState> {
  // Defense in depth — react-hook-form + zodResolver already validated
  // this client-side before calling here.
  const parsed = signupSchema.safeParse(values);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Confere os dados aí." };
  }

  const { name, email, password } = parsed.data;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const callbackUrl = new URL("/callback", siteUrl);
  callbackUrl.searchParams.set("next", sanitizeNextPath(next));
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    return {
      error:
        error.code === "user_already_exists"
          ? "Esse e-mail já tem cadastro. Bora fazer login?"
          : "Não rolou o cadastro. Tenta de novo.",
    };
  }

  // Auto-confirm is off by default on Supabase, so there's no session yet —
  // ask the player to check their inbox instead of redirecting.
  if (!data.session) {
    return { success: true };
  }

  redirect(sanitizeNextPath(next));
}

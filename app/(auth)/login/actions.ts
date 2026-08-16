"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

export type LoginState = { error: string } | undefined;

export async function login(values: LoginInput): Promise<LoginState> {
  // react-hook-form + zodResolver already validated this client-side —
  // re-validating here is just defense in depth against a direct call to
  // this Server Action bypassing the form.
  const parsed = loginSchema.safeParse(values);

  if (!parsed.success) {
    return { error: "Confere teu e-mail e senha aí." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "E-mail ou senha errados. Bora tentar de novo." };
  }

  // `redirect()` triggers a client-side navigation even when this action is
  // invoked directly (not via a <form action>) — Next.js handles it the
  // same way through the Server Action dispatch protocol either way.
  redirect("/events");
}

export async function loginWithGoogle() {
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl}/callback` },
  });

  if (error || !data.url) {
    redirect("/login?error=google");
  }

  redirect(data.url);
}

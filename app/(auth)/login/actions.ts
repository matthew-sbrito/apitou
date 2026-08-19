"use server";

import { redirect } from "next/navigation";
import { sanitizeNextPath } from "@/lib/auth/next-path";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

export type LoginState = { error: string } | undefined;

export async function login(
  values: LoginInput,
  next?: string,
): Promise<LoginState> {
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
  redirect(sanitizeNextPath(next));
}

export async function loginWithGoogle(next?: string) {
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const callbackUrl = new URL("/callback", siteUrl);
  callbackUrl.searchParams.set("next", sanitizeNextPath(next));

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl.toString() },
  });

  if (error || !data.url) {
    redirect("/login?error=google");
  }

  redirect(data.url);
}

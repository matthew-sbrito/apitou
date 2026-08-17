import { Logo } from "@/components/brand/logo";
import { SyncBadge } from "@/components/layout/sync-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

function initialsFor(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = "Jogador";
  let avatarUrl: string | undefined;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("custom_name")
      .eq("user_id", user.id)
      .maybeSingle();

    displayName =
      profile?.custom_name ??
      (user.user_metadata?.name as string | undefined) ??
      user.email ??
      "Jogador";
    avatarUrl =
      (user.user_metadata?.avatar_url as string | undefined) ??
      (user.user_metadata?.picture as string | undefined);
  }

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-apito-black/85 px-2 py-2 backdrop-blur-md sm:px-6"
      style={{ paddingTop: "calc(var(--safe-top) + 0.75rem)" }}
    >
      <Link href="/events">
        <Logo imageClassName="h-8 sm:h-10" wordClassName="text-sm sm:text-lg" />
      </Link>
      <div className="flex items-center gap-4">
        <SyncBadge />
        {user && (
          <Link href="/profile" aria-label="Seu perfil" title="Seu perfil">
            <Avatar size="sm">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback>{initialsFor(displayName)}</AvatarFallback>
            </Avatar>
          </Link>
        )}
      </div>
    </header>
  );
}

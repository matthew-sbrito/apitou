import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { logout } from "@/app/(app)/actions";
import { SyncBadge } from "@/components/layout/sync-badge";
import { Logo } from "@/components/brand/logo";

export function AppHeader() {
  return (
    <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
      <Link href="/events">
        <Logo />
      </Link>
      <div className="flex items-center gap-4">
        <SyncBadge />
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}

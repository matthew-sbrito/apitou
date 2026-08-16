import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { logout } from "@/app/(app)/actions";
import { SyncBadge } from "@/components/layout/sync-badge";
import { Logo } from "@/components/brand/logo";

export function AppHeader() {
  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-apito-black/85 px-4 py-3 backdrop-blur-md sm:px-6"
      style={{ paddingTop: "calc(var(--safe-top) + 0.75rem)" }}
    >
      <Link href="/events">
        <Logo />
      </Link>
      <div className="flex items-center gap-4">
        <SyncBadge />
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}

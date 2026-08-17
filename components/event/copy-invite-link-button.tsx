"use client";

import { Button } from "@/components/ui/button";
import { Link2 } from "lucide-react";
import { toast } from "sonner";

export function CopyInviteLinkButton({ eventId }: { eventId: string }) {
  async function copy() {
    const url = `${window.location.origin}/events/${eventId}/join`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado! Manda pra galera entrar.");
    } catch {
      toast.error("Não rolou copiar o link. Tenta de novo.");
    }
  }

  return (
    <Button type="button" variant="outline" onClick={copy}>
      <Link2 className="h-4 w-4" />
      Copiar link
    </Button>
  );
}

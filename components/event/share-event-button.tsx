"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";

export function ShareEventButton({ eventId }: { eventId: string }) {
  async function share() {
    const url = `${window.location.origin}/events/${eventId}/join`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado! Manda pra galera entrar.");
    } catch {
      toast.error("Não rolou copiar. Link: " + url);
    }
  }

  return (
    <Button type="button" variant="secondary" onClick={share}>
      <Share2 className="h-4 w-4" />
      Compartilhar
    </Button>
  );
}

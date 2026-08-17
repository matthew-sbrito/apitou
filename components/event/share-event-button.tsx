"use client";

import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

export function ShareEventButton({
  eventId,
  eventName,
}: {
  eventId: string;
  eventName: string;
}) {
  async function share() {
    const url = `${window.location.origin}/events/${eventId}/join`;
    const text = `🟢 Apito inicial marcado: ${eventName}!\n\nFalta só você entrar em campo. Garante sua vaga aqui:\n\n${url}`;

    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch (err) {
        // AbortError = user closed the share sheet — not a failure.
        if (err instanceof Error && err.name !== "AbortError") {
          await copyToClipboard(url);
        }
      }
      return;
    }

    await copyToClipboard(url);
  }

  async function copyToClipboard(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado! Manda pra galera entrar.");
    } catch {
      toast.error("Não rolou compartilhar o link. Tenta de novo.");
    }
  }

  return (
    <Button type="button" variant="secondary" onClick={share}>
      <Share2 className="h-4 w-4" />
      Compartilhar
    </Button>
  );
}

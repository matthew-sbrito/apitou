"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wand2 } from "lucide-react";
import { useState, useTransition } from "react";
import { addRandomPlayers } from "./actions";

/** Dev-only shortcut to populate a roster for local testing — see
 * `addRandomPlayers` in `./actions.ts`, which is the actual gate (this
 * component is only ever rendered when `NODE_ENV === "development"`, but
 * the action re-checks since it's callable directly). */
export function DevAddRandomPlayers({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(10);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      await addRandomPlayers(eventId, count);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="outline" size="sm" />}
      >
        <Wand2 className="h-4 w-4" />
        Gerar jogadores
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Gerar jogadores</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <Label htmlFor="randomPlayerCount" className="shrink-0">
            Quantos
          </Label>
          <Input
            id="randomPlayerCount"
            type="number"
            min={1}
            max={30}
            value={count}
            onChange={(e) => setCount(Number(e.target.value) || 1)}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            disabled={pending}
            onClick={confirm}
            className="w-full"
          >
            {pending ? "Gerando..." : "Gerar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

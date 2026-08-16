"use client";

import { Input } from "@/components/ui/input";
import { useState, useTransition } from "react";
import { updatePlayerRating } from "./actions";

export function EditableRating({
  eventId,
  playerId,
  rating,
  readOnly = false,
}: {
  eventId: string;
  playerId: string;
  rating: number | null;
  readOnly?: boolean;
}) {
  const [value, setValue] = useState(rating != null ? String(rating) : "");
  const [pending, startTransition] = useTransition();

  if (readOnly) {
    return (
      <span className="w-24 text-center text-xs text-muted-foreground">
        {rating != null ? `Nota ${rating}` : "Sem nota"}
      </span>
    );
  }

  function commit() {
    const trimmed = value.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (
      parsed !== null &&
      (Number.isNaN(parsed) || parsed < 0 || parsed > 10)
    ) {
      setValue(rating != null ? String(rating) : "");
      return;
    }
    if (parsed === rating) return;
    startTransition(() => updatePlayerRating(eventId, playerId, parsed));
  }

  return (
    <Input
      type="number"
      min={0}
      max={10}
      step={0.5}
      placeholder="Nota"
      value={value}
      disabled={pending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      className="h-7 w-24 text-xs"
    />
  );
}

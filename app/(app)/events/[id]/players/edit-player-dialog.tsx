"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { playerStatusLabel } from "@/lib/labels";
import { editPlayerSchema, type EditPlayerInput } from "@/lib/validation/event";
import type { EventPlayer, PlayerStatus } from "@/types/database";
import { Pencil } from "lucide-react";
import { updatePlayer } from "./actions";

const STATUS_OPTIONS: PlayerStatus[] = ["active", "injured", "left"];

export function EditPlayerDialog({
  eventId,
  player,
}: {
  eventId: string;
  player: EventPlayer;
}) {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<EditPlayerInput>({
    resolver: zodResolver(editPlayerSchema),
    defaultValues: {
      rating: player.rating ?? undefined,
      is_goalkeeper: player.is_goalkeeper,
      is_substitute: player.is_substitute,
      status: player.status,
    },
  });

  async function onSubmit(values: EditPlayerInput) {
    setFormError(null);
    const result = await updatePlayer(eventId, player.id, values);
    if (result?.error) {
      setFormError(result.error);
      return;
    }
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setFormError(null);
          reset({
            rating: player.rating ?? undefined,
            is_goalkeeper: player.is_goalkeeper,
            is_substitute: player.is_substitute,
            status: player.status,
          });
        }
      }}
    >
      <DialogTrigger render={<Button type="button" variant="ghost" size="icon" />}>
        <Pencil className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar {player.name}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="rating"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Nota</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === ""
                          ? undefined
                          : e.target.valueAsNumber,
                      )
                    }
                    onBlur={field.onBlur}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="status">Status</FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      if (v) field.onChange(v);
                    }}
                  >
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue placeholder="Status">
                        {(status: PlayerStatus | null) =>
                          status ? playerStatusLabel[status] : "Status"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {playerStatusLabel[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>

          <div className="flex flex-col gap-3">
            <Controller
              name="is_goalkeeper"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                  Goleiro
                </label>
              )}
            />
            <Controller
              name="is_substitute"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                  Suplente
                </label>
              )}
            />
          </div>

          {formError && <p className="text-sm text-apito-red">{formError}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

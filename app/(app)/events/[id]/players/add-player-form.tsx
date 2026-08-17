"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { playerSchema, type PlayerInput } from "@/lib/validation/event";
import { addPlayer } from "./actions";

export function AddPlayerForm({ eventId }: { eventId: string }) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { isSubmitting },
  } = useForm<PlayerInput>({
    resolver: zodResolver(playerSchema),
    defaultValues: { name: "", rating: undefined, is_goalkeeper: false, is_substitute: false },
  });

  async function onSubmit(values: PlayerInput) {
    setFormError(null);
    const result = await addPlayer(eventId, values);
    if (result?.error) {
      // Duplicate-name conflicts land on the name field itself, right where
      // it's editable, instead of a generic banner — the fix is to just
      // change what's already typed there.
      if (result.field === "name") {
        setError("name", { type: "manual", message: result.error });
      } else {
        setFormError(result.error);
      }
      return;
    }
    reset();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-3 rounded-2xl border border-white/10 p-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nome</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="Nome do jogador"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>

        <Controller
          name="rating"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Nota (opcional)</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)
                }
                onBlur={field.onBlur}
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <div className="flex flex-col justify-end gap-3">
          <Controller
            name="is_goalkeeper"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
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
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
                Suplente
              </label>
            )}
          />
        </div>
      </div>
      {formError && <p className="text-sm text-apito-red">{formError}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Adicionando..." : "Adicionar jogador"}
      </Button>
    </form>
  );
}

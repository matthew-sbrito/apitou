"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { DateTimePicker } from "@/components/form/date-time-picker";
import { eventSchema, type EventInput } from "@/lib/validation/event";

export function EventForm({
  defaultValues,
  onSubmit,
  submitLabel,
  submittingLabel,
}: {
  defaultValues: EventInput;
  onSubmit: (values: EventInput) => Promise<{ error?: string } | undefined>;
  submitLabel: string;
  submittingLabel: string;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues,
  });

  async function handle(values: EventInput) {
    setFormError(null);
    const result = await onSubmit(values);
    if (result?.error) setFormError(result.error);
  }

  return (
    <form onSubmit={handleSubmit(handle)}>
      <FieldGroup>
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Nome da pelada</FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="Pelada de sexta"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="location"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Local</FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="Quadra do bairro"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="scheduled_at"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Data e hora</FieldLabel>
              <DateTimePicker value={field.value ?? ""} onChange={field.onChange} />
            </Field>
          )}
        />

        <Controller
          name="team_size"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Jogadores de linha por time</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="number"
                min={1}
                max={11}
                value={field.value}
                onChange={(e) => field.onChange(e.target.valueAsNumber)}
                onBlur={field.onBlur}
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="has_goalkeeper"
          control={control}
          render={({ field }) => (
            <Field
              orientation="horizontal"
              className="rounded-xl border border-white/10 px-4 py-3"
            >
              <FieldLabel htmlFor={field.name} className="flex-col items-start gap-0">
                Tem goleiro
                <FieldDescription>
                  Se desligar, todo mundo joga na linha.
                </FieldDescription>
              </FieldLabel>
              <Switch
                id={field.name}
                name={field.name}
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
            </Field>
          )}
        />

        {formError && <p className="text-sm text-apito-red">{formError}</p>}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      </FieldGroup>
    </form>
  );
}

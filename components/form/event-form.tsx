"use client";

import { DateTimePicker } from "@/components/form/date-time-picker";
import { LocationMapPicker } from "@/components/form/location-map-picker";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { drawRuleLabel } from "@/lib/labels";
import { eventSchema, type EventInput } from "@/lib/validation/event";
import type { DrawRule } from "@/types/database";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

const DRAW_RULE_OPTIONS: DrawRule[] = [
  "defender_leaves",
  "challenger_leaves",
  "both_leave",
  "penalties",
];

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
              <div className="flex gap-2">
                <Input
                  {...field}
                  id={field.name}
                  placeholder="Quadra do bairro"
                  aria-invalid={fieldState.invalid}
                />
                <LocationMapPicker control={control} />
              </div>
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
              <DateTimePicker
                value={field.value ?? ""}
                onChange={field.onChange}
              />
            </Field>
          )}
        />

        <Controller
          name="team_size"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Jogadores de linha por time
              </FieldLabel>
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
              <FieldLabel
                htmlFor={field.name}
                className="flex-col items-start gap-0"
              >
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

        <FieldSeparator />

        <Controller
          name="drawRule"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Empate na fila</FieldLabel>
              <FieldDescription>
                Decide quem sai da quadra quando a partida termina empatada.
              </FieldDescription>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id={field.name} className="w-full">
                  <SelectValue placeholder="Regra de empate">
                    {(value: DrawRule | null) =>
                      value ? drawRuleLabel[value] : "Regra de empate"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DRAW_RULE_OPTIONS.map((rule) => (
                    <SelectItem key={rule} value={rule}>
                      {drawRuleLabel[rule]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        />

        <Controller
          name="maxReign"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Máximo de partidas seguidas
              </FieldLabel>
              <FieldDescription>
                Time que &quot;fica&quot; esse tanto de vezes seguidas vai pro
                fim da fila mesmo ganhando.
              </FieldDescription>
              <Input
                id={field.name}
                name={field.name}
                type="number"
                min={1}
                placeholder="Sem limite"
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? null : e.target.valueAsNumber,
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
          name="matchDurationMs"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Duração da partida (minutos)
              </FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="number"
                min={1}
                placeholder="Sem limite"
                value={field.value == null ? "" : field.value / 60000}
                onChange={(e) => {
                  if (e.target.value === "") {
                    field.onChange(null);
                    return;
                  }
                  field.onChange(Math.round(e.target.valueAsNumber * 60000));
                }}
                onBlur={field.onBlur}
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="goalLimit"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Limite de gols</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="number"
                min={1}
                placeholder="Sem limite"
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? null : e.target.valueAsNumber,
                  )
                }
                onBlur={field.onBlur}
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
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

"use client";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { profileSchema, type ProfileInput } from "@/lib/validation/profile";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateProfile } from "./actions";

export function ProfileForm({
  defaultValues,
}: {
  defaultValues: ProfileInput;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  async function handle(values: ProfileInput) {
    setFormError(null);

    const result = await updateProfile(values);

    if (result?.error) {
      setFormError(result.error);
      return;
    }

    toast.success("Perfil atualizado! Agora so participar das peladas.");
  }

  return (
    <form onSubmit={handleSubmit(handle)}>
      <FieldGroup>
        <Controller
          name="custom_name"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Como você quer ser chamado
              </FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="Seu nome"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="rating"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Sua nota</FieldLabel>
              <FieldDescription>
                Usada automaticamente quando você entra numa pelada.
              </FieldDescription>
              <Input
                id={field.name}
                name={field.name}
                type="number"
                min={0}
                max={10}
                step={0.5}
                placeholder="Nota"
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? undefined : e.target.valueAsNumber,
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
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </FieldGroup>
    </form>
  );
}

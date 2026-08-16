"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { teamSchema, type TeamInput } from "@/lib/validation/event";
import { addTeamManually } from "./actions";

export function AddTeamForm({ eventId }: { eventId: string }) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<TeamInput>({
    resolver: zodResolver(teamSchema),
    defaultValues: { name: "", color: "#f5c400" },
  });

  async function onSubmit(values: TeamInput) {
    setFormError(null);
    const result = await addTeamManually(eventId, values);
    if (result?.error) {
      setFormError(result.error);
      return;
    }
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Nome do time" />
            )}
          />
        </div>
        <Controller
          name="color"
          control={control}
          render={({ field }) => (
            <Input {...field} type="color" className="w-14 p-1" />
          )}
        />
        <Button type="submit" variant="outline" disabled={isSubmitting}>
          Adicionar
        </Button>
      </div>
      {formError && <p className="text-sm text-apito-red">{formError}</p>}
    </form>
  );
}

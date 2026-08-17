import { z } from "zod";

export const profileSchema = z.object({
  custom_name: z
    .string()
    .trim()
    .min(2, { error: "Precisa de pelo menos 2 letras." }),
  // Not z.coerce.number(): the input already produces a real number via
  // `valueAsNumber` in the Controller's onChange — see lib/validation/event.ts.
  rating: z.number().min(0).max(10).optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

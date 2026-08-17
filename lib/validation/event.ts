import { z } from "zod";

export const eventSchema = z.object({
  name: z.string().trim().min(2, { error: "Dá um nome pra pelada." }),
  location: z.string().trim().optional(),
  scheduled_at: z.string().optional(),
  // Not z.coerce.number(): the form already produces a real number via
  // `valueAsNumber` in the Controller's onChange, so input type === output
  // type here — coerce would otherwise widen the resolver's input type to
  // `unknown` and break inference against useForm<EventInput>.
  team_size: z
    .number()
    .int()
    .min(1, { error: "Pelo menos 1 jogador de linha por time." })
    .max(11, { error: "Máximo de 11 jogadores de linha por time." }),
  has_goalkeeper: z.boolean(),
});

export type EventInput = z.infer<typeof eventSchema>;

export const playerSchema = z.object({
  name: z.string().trim().min(1, { error: "Dá um nome pro jogador." }),
  rating: z.number().min(0).max(10).optional(),
  is_goalkeeper: z.boolean(),
  is_substitute: z.boolean(),
});

export type PlayerInput = z.infer<typeof playerSchema>;

export const editPlayerSchema = z.object({
  rating: z.number().min(0).max(10).optional(),
  is_goalkeeper: z.boolean(),
  is_substitute: z.boolean(),
  status: z.enum(["active", "injured", "left"]),
});

export type EditPlayerInput = z.infer<typeof editPlayerSchema>;

export const teamSchema = z.object({
  name: z.string().trim().min(1, { error: "Dá um nome pro time." }),
  color: z.string().trim().optional(),
});

export type TeamInput = z.infer<typeof teamSchema>;

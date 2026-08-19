import { z } from "zod";

export const eventSchema = z.object({
  name: z.string().trim().min(2, { error: "Dá um nome pra pelada." }),
  location: z.string().trim().optional(),
  // Independent of `location` — set only by the map picker, never typed.
  // Nullable rather than optional, matching maxReign/matchDurationMs/
  // goalLimit below (null = "not set").
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
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
  // Rules (EventRules in types/database.ts) flattened onto the same form —
  // one submit for the whole event, event.rules is assembled from these
  // four fields in createEvent/updateEvent.
  drawRule: z.enum([
    "both_leave",
    "defender_leaves",
    "challenger_leaves",
    "penalties",
  ]),
  // Nulls mean "sem limite" — left unset on purpose, not a 0/blank default.
  maxReign: z
    .number()
    .int()
    .min(1, { error: "Pelo menos 1 partida." })
    .nullable(),
  matchDurationMs: z
    .number()
    .int()
    .min(1, { error: "A duração precisa ser maior que zero." })
    .nullable(),
  goalLimit: z
    .number()
    .int()
    .min(1, { error: "Pelo menos 1 gol." })
    .nullable(),
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

import type {
  DrawRule,
  EventStatus,
  MatchEventType,
  MatchStatus,
  PlayerStatus,
} from "@/types/database";

export const eventStatusLabel: Record<EventStatus, string> = {
  draft: "Rascunho",
  running: "Rolando",
  finished: "Encerrado",
};

/** Who leaves the quadra when a match on "quem ganha fica" ends empatada —
 * defensor/desafiante per lib/queue-engine.ts's applyResult (PLAN.md §7.2):
 * the defensor is whichever team has been on court longer. */
export const drawRuleLabel: Record<DrawRule, string> = {
  defender_leaves: "Quem tava na quadra sai",
  challenger_leaves: "Quem chegou agora sai",
  both_leave: "Os dois times saem",
  penalties: "Decide nos pênaltis",
};

export const matchStatusLabel: Record<MatchStatus, string> = {
  scheduled: "Marcada",
  running: "Bola rolando",
  paused: "Bola parada",
  finished: "Apitada",
  cancelled: "Cancelada",
};

export const playerStatusLabel: Record<PlayerStatus, string> = {
  active: "Ativo",
  injured: "Machucado",
  left: "Foi embora",
};

/** Only the types worth showing in a match's event timeline — pause/resume
 * are administrative, and void/voided originals are filtered out before
 * this label is ever consulted (see the matches page). */
export const matchEventTypeLabel: Partial<Record<MatchEventType, string>> = {
  goal: "Gol",
  own_goal: "Gol contra",
  penalty_goal: "Pênalti",
  assist: "Assistência",
  foul: "Falta",
  yellow_card: "Cartão amarelo",
  red_card: "Cartão vermelho",
  blue_card: "Cartão azul",
  suspension: "Suspensão temporária",
  sub_in: "Entrou em campo",
  sub_out: "Saiu de campo",
  injury: "Lesão",
};

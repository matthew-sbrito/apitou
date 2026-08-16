import type {
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

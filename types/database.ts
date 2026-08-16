// Hand-written to mirror supabase/migrations/0001_init.sql — there is no live
// project to run `supabase gen types` against yet. Keep these two in sync.

export type EventStatus = "draft" | "running" | "finished";
export type PlayerStatus = "active" | "injured" | "left";
export type MatchStatus =
  | "scheduled"
  | "running"
  | "paused"
  | "finished"
  | "cancelled";
export type LineupRole = "line" | "gk";
export type DrawRule =
  | "both_leave"
  | "defender_leaves"
  | "challenger_leaves"
  | "penalties";

export type MatchEventType =
  | "goal"
  | "own_goal"
  | "penalty_goal"
  | "assist"
  | "foul"
  | "yellow_card"
  | "red_card"
  | "blue_card"
  | "suspension"
  | "sub_in"
  | "sub_out"
  | "pause"
  | "resume"
  | "injury"
  | "void";

export type MatchEventReason =
  | "injury"
  | "substitution"
  | "correction"
  | "external"
  | "manual"
  | "halftime";

export type EventRules = {
  drawRule: DrawRule;
  maxReign: number | null;
  matchDurationMs: number | null;
  goalLimit: number | null;
};

export type Event = {
  id: string;
  owner_id: string;
  name: string;
  location: string | null;
  scheduled_at: string | null;
  team_size: number;
  has_goalkeeper: boolean;
  status: EventStatus;
  paused_at: string | null;
  pause_reason: string | null;
  rules: EventRules;
  created_at: string;
};

export type EventPlayer = {
  id: string;
  event_id: string;
  user_id: string | null;
  name: string;
  rating: number | null;
  is_goalkeeper: boolean;
  is_substitute: boolean;
  status: PlayerStatus;
  status_note: string | null;
  created_at: string;
};

export type EventTeam = {
  id: string;
  event_id: string;
  name: string;
  color: string | null;
  queue_position: number;
  created_at: string;
};

export type EventTeamPlayer = {
  id: string;
  event_team_id: string;
  event_player_id: string;
  created_at: string;
};

export type Match = {
  id: string;
  event_id: string;
  sequence: number;
  home_team_id: string;
  away_team_id: string;
  status: MatchStatus;
  started_at: string | null;
  accumulated_ms: number;
  regulation_ms: number | null;
  finished_at: string | null;
  created_at: string;
};

export type MatchLineup = {
  id: string;
  match_id: string;
  event_team_id: string;
  event_player_id: string;
  role: LineupRole;
};

export type MatchEvent = {
  id: string;
  match_id: string;
  event_team_id: string | null;
  event_player_id: string | null;
  related_player_id: string | null;
  type: MatchEventType;
  clock_ms: number;
  suspension_ms: number | null;
  reason: MatchEventReason | null;
  voided_event_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

// ── Views ────────────────────────────────────────────────────────────────

export type MatchScoreRow = {
  match_id: string;
  event_id: string;
  sequence: number;
  home_team_id: string;
  away_team_id: string;
  home_goals: number;
  away_goals: number;
  home_penalties: number;
  away_penalties: number;
  status: MatchStatus;
};

export type MatchResultRow = MatchScoreRow & {
  result: "home" | "away" | "draw";
};

export type EventStandingRow = {
  event_id: string;
  team_id: string;
  team_name: string;
  color: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
};

export type EventScorerRow = {
  event_id: string;
  player_id: string;
  player_name: string;
  goals: number;
  assists: number;
  own_goals: number;
  yellow_cards: number;
  red_cards: number;
  fouls: number;
};

export type EventGkStatsRow = {
  event_id: string;
  player_id: string;
  player_name: string;
  matches_played: number;
  goals_against: number;
};

// supabase-js's generic client resolves every `.from()`/`.select()` call
// against this shape. Each table/view needs `Relationships` (even if empty)
// or the client silently collapses row types to `never` instead of erroring.
export type Database = {
  public: {
    Tables: {
      events: {
        Row: Event;
        Insert: Partial<Event>;
        Update: Partial<Event>;
        Relationships: [];
      };
      event_players: {
        Row: EventPlayer;
        Insert: Partial<EventPlayer>;
        Update: Partial<EventPlayer>;
        Relationships: [];
      };
      event_teams: {
        Row: EventTeam;
        Insert: Partial<EventTeam>;
        Update: Partial<EventTeam>;
        Relationships: [];
      };
      event_team_players: {
        Row: EventTeamPlayer;
        Insert: Partial<EventTeamPlayer>;
        Update: Partial<EventTeamPlayer>;
        Relationships: [];
      };
      matches: {
        Row: Match;
        Insert: Partial<Match>;
        Update: Partial<Match>;
        Relationships: [];
      };
      match_lineups: {
        Row: MatchLineup;
        Insert: Partial<MatchLineup>;
        Update: Partial<MatchLineup>;
        Relationships: [];
      };
      match_events: {
        Row: MatchEvent;
        Insert: Partial<MatchEvent>;
        Update: Partial<MatchEvent>;
        Relationships: [];
      };
    };
    Views: {
      valid_match_events: { Row: MatchEvent; Relationships: [] };
      match_scores: { Row: MatchScoreRow; Relationships: [] };
      match_results: { Row: MatchResultRow; Relationships: [] };
      event_standings: { Row: EventStandingRow; Relationships: [] };
      event_scorers: { Row: EventScorerRow; Relationships: [] };
      event_gk_stats: { Row: EventGkStatsRow; Relationships: [] };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

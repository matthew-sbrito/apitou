"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Flag, Square, Pause } from "lucide-react";
import { useMatchStore } from "@/components/match/match-store-provider";
import { useMatchActions } from "@/hooks/use-match-actions";
import { PlayerActionDialog, type TeamRoster } from "@/components/match/player-action-dialog";

export function ActionBar() {
  const homeTeam = useMatchStore((s) => s.homeTeam);
  const awayTeam = useMatchStore((s) => s.awayTeam);
  const lineups = useMatchStore((s) => s.lineups);
  const players = useMatchStore((s) => s.players);
  const actions = useMatchActions();

  const [dialog, setDialog] = useState<"goal" | "foul" | "card" | null>(null);

  const rosters: TeamRoster[] = useMemo(() => {
    return [homeTeam, awayTeam].map((team) => ({
      team,
      players: lineups
        .filter((l) => l.event_team_id === team.id)
        .map((l) => players[l.event_player_id])
        .filter((p) => p && p.status === "active"),
    }));
  }, [homeTeam, awayTeam, lineups, players]);

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <ActionButton
          icon={<span className="text-2xl leading-none">⚽</span>}
          label="Gol"
          onClick={() => setDialog("goal")}
        />
        <ActionButton icon={<Flag className="h-6 w-6" />} label="Falta" onClick={() => setDialog("foul")} />
        <ActionButton icon={<Square className="h-6 w-6" />} label="Cartão" onClick={() => setDialog("card")} />
      </div>

      <Button
        type="button"
        size="lg"
        variant="secondary"
        className="w-full"
        onClick={() => actions.pause("manual")}
      >
        <Pause className="h-5 w-5" />
        Bola parada
      </Button>

      <PlayerActionDialog
        open={dialog === "goal"}
        onOpenChange={(o) => setDialog(o ? "goal" : null)}
        title="Quem fez o gol?"
        rosters={rosters}
        confirmLabel="Registrar gol"
        extraOptions={[
          { value: "goal", label: "Gol" },
          { value: "own_goal", label: "Contra" },
          { value: "penalty_goal", label: "Pênalti" },
        ]}
        onConfirm={({ teamId, playerId, extra }) =>
          actions.recordGoal({
            teamId,
            playerId,
            type: (extra as "goal" | "own_goal" | "penalty_goal") ?? "goal",
          })
        }
      />

      <PlayerActionDialog
        open={dialog === "foul"}
        onOpenChange={(o) => setDialog(o ? "foul" : null)}
        title="Quem cometeu a falta?"
        rosters={rosters}
        confirmLabel="Registrar falta"
        onConfirm={({ teamId, playerId }) => actions.recordFoul(teamId, playerId)}
      />

      <PlayerActionDialog
        open={dialog === "card"}
        onOpenChange={(o) => setDialog(o ? "card" : null)}
        title="Cartão pra quem?"
        rosters={rosters}
        confirmLabel="Registrar cartão"
        extraOptions={[
          { value: "yellow_card", label: "Amarelo" },
          { value: "red_card", label: "Vermelho" },
          { value: "blue_card", label: "Azul" },
        ]}
        onConfirm={({ teamId, playerId, extra }) =>
          actions.recordCard(
            teamId,
            playerId,
            (extra as "yellow_card" | "red_card" | "blue_card") ?? "yellow_card",
          )
        }
      />
    </>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-apito-yellow text-apito-black transition-transform active:scale-95"
    >
      {icon}
      <span className="text-sm font-bold">{label}</span>
    </button>
  );
}

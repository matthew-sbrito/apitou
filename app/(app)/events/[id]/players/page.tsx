import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { playerStatusLabel } from "@/lib/labels";
import { AddPlayerForm } from "./add-player-form";
import { EditableRating } from "./editable-rating";
import { removePlayer, setPlayerStatus } from "./actions";
import { Trash2 } from "lucide-react";

export default async function PlayersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const supabase = await createClient();
  const [{ data: players }, { data: event }] = await Promise.all([
    supabase
      .from("event_players")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true }),
    supabase.from("events").select("status").eq("id", eventId).single(),
  ]);

  const allPlayers = players ?? [];
  const activeCount = allPlayers.filter((p) => p.status === "active").length;
  const readOnly = event?.status === "finished";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Jogadores{" "}
          <span className="text-lg font-normal text-muted-foreground">
            ({allPlayers.length})
          </span>
        </h1>
        {allPlayers.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {activeCount} ativo(s)
            {activeCount !== allPlayers.length &&
              ` de ${allPlayers.length} cadastrado(s)`}
          </p>
        )}
      </div>

      {readOnly ? (
        <p className="rounded-xl border border-white/10 bg-card px-4 py-3 text-sm text-muted-foreground">
          Evento encerrado — lista de jogadores só pra consulta.
        </p>
      ) : (
        <AddPlayerForm eventId={eventId} />
      )}

      <ul className="flex flex-col gap-2">
        {allPlayers.map((player) => (
          <li
            key={player.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3"
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">
                {player.name}
                {player.is_goalkeeper && (
                  <span className="ml-2 text-xs text-apito-yellow">GK</span>
                )}
                {player.is_substitute && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    suplente
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <EditableRating
                eventId={eventId}
                playerId={player.id}
                rating={player.rating}
                readOnly={readOnly}
              />
              <Badge
                variant={player.status === "active" ? "secondary" : "outline"}
              >
                {playerStatusLabel[player.status]}
              </Badge>

              {!readOnly && player.status !== "injured" && (
                <form action={setPlayerStatus.bind(null, eventId, player.id, "injured")}>
                  <Button type="submit" variant="ghost" size="sm">
                    Machucou
                  </Button>
                </form>
              )}
              {!readOnly && player.status !== "active" && (
                <form action={setPlayerStatus.bind(null, eventId, player.id, "active")}>
                  <Button type="submit" variant="ghost" size="sm">
                    Voltou
                  </Button>
                </form>
              )}

              {!readOnly && (
                <form action={removePlayer.bind(null, eventId, player.id)}>
                  <Button type="submit" variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-apito-red" />
                  </Button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { playerStatusLabel } from "@/lib/labels";
import { AddPlayerForm } from "./add-player-form";
import { EditableRating } from "./editable-rating";
import { removePlayer, setPlayerStatus } from "./actions";
import { PlayerMembershipButton } from "@/components/event/player-membership-button";
import { Trash2 } from "lucide-react";

export default async function PlayersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const supabase = await createClient();
  const [
    { data: players },
    { data: event },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .from("event_players")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true }),
    supabase.from("events").select("status, owner_id").eq("id", eventId).single(),
    supabase.auth.getUser(),
  ]);

  const allPlayers = players ?? [];
  const activeCount = allPlayers.filter((p) => p.status === "active").length;
  const isOwner = user?.id === event?.owner_id;
  const readOnly = !isOwner || event?.status === "finished";

  const myPlayer = allPlayers.find((p) => p.user_id === user?.id);

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

      {isOwner &&
        (event?.status === "finished" ? (
          <p className="rounded-xl border border-white/10 bg-card px-4 py-3 text-sm text-muted-foreground">
            Evento encerrado — lista de jogadores só pra consulta.
          </p>
        ) : (
          <AddPlayerForm eventId={eventId} />
        ))}

      {!isOwner && event?.status !== "finished" && (
        <div className="rounded-xl border border-white/10 bg-card px-4 py-3">
          <PlayerMembershipButton
            eventId={eventId}
            myPlayerId={myPlayer?.id ?? null}
            defaultName={
              (user?.user_metadata?.name as string | undefined) ?? "Jogador"
            }
          />
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {allPlayers.map((player) => (
          <li
            key={player.id}
            className="flex flex-col gap-2 rounded-xl border border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
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
                {player.user_id === user?.id && (
                  <span className="ml-2 text-xs text-apito-yellow">você</span>
                )}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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

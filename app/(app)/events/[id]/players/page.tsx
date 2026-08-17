import { PlayerMembershipButton } from "@/components/event/player-membership-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { playerStatusLabel } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import type { EventScorerRow } from "@/types/database";
import { Square, Star, Trash2 } from "lucide-react";
import { removePlayer } from "./actions";
import { AddPlayerForm } from "./add-player-form";
import { DevAddRandomPlayers } from "./dev-add-random-players";
import { EditPlayerDialog } from "./edit-player-dialog";

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
    { data: scorers },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .from("event_players")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true }),
    supabase
      .from("events")
      .select("status, owner_id")
      .eq("id", eventId)
      .single(),
    supabase.from("event_scorers").select("*").eq("event_id", eventId),
    supabase.auth.getUser(),
  ]);

  const statsByPlayer = new Map<string, EventScorerRow>(
    (scorers ?? []).map((s) => [s.player_id, s]),
  );

  const allPlayers = [...(players ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
  );
  const activeCount = allPlayers.filter((p) => p.status === "active").length;
  const isOwner = user?.id === event?.owner_id;
  const readOnly = !isOwner || event?.status === "finished";

  const myPlayer = allPlayers.find((p) => p.user_id === user?.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
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
        {process.env.NODE_ENV === "development" &&
          isOwner &&
          event?.status !== "finished" && (
            <DevAddRandomPlayers eventId={eventId} />
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
        {allPlayers.map((player) => {
          const stats = statsByPlayer.get(player.id);
          return (
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
                {!!stats?.goals && (
                  <span
                    className="flex items-center gap-0.5 text-xs text-muted-foreground"
                    title={`${stats.goals} gol(s)`}
                  >
                    <span className="text-sm">⚽</span>
                    {stats.goals}
                  </span>
                )}
                {!!stats?.assists && (
                  <span
                    className="flex items-center gap-0.5 text-xs text-muted-foreground"
                    title={`${stats.assists} assistência(s)`}
                  >
                    <span className="text-sm">👟</span>
                    {stats.assists}
                  </span>
                )}
                {!!stats?.yellow_cards && (
                  <span
                    className="flex items-center gap-0.5 text-xs text-muted-foreground"
                    title={`${stats.yellow_cards} cartão(ões) amarelo(s)`}
                  >
                    <Square className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {stats.yellow_cards}
                  </span>
                )}
                {!!stats?.red_cards && (
                  <span
                    className="flex items-center gap-0.5 text-xs text-muted-foreground"
                    title={`${stats.red_cards} cartão(ões) vermelho(s)`}
                  >
                    <Square className="h-3 w-3 fill-apito-red text-apito-red" />
                    {stats.red_cards}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3.5 w-3.5 text-apito-yellow" />
                  {player.rating != null ? player.rating : "Sem nota"}
                </span>
                <Badge
                  variant={player.status === "active" ? "secondary" : "outline"}
                >
                  {playerStatusLabel[player.status]}
                </Badge>

                {!readOnly && (
                  <EditPlayerDialog eventId={eventId} player={player} />
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
          );
        })}
      </ul>
    </div>
  );
}

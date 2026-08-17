import { StartEventButton } from "@/components/event/start-event-button";
import { FinishEventButton } from "@/components/event/finish-event-button";
import { ShareEventButton } from "@/components/event/share-event-button";
import { CopyInviteLinkButton } from "@/components/event/copy-invite-link-button";
import { LeaveEventButton } from "@/components/event/leave-event-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { eventStatusLabel } from "@/lib/labels";
import { formatEventDateTime } from "@/lib/format-date";
import { createClient } from "@/lib/supabase/server";
import {
  CalendarClock,
  Pencil,
  PlayCircle,
  ScrollText,
  Shirt,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

async function getData(eventId: string) {
  const supabase = await createClient();

  const eventCall = supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  const playerCountCall = supabase
    .from("event_players")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  const teamCountCall = supabase
    .from("event_teams")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  // Latest match regardless of status — a *finished* match still needs a
  // way back in, since that's exactly where the next-match suggestion
  // lives (components/match/next-match-panel.tsx). Filtering it out here
  // stranded the operator with no path back once they left that page.
  const currentMatchCall = supabase
    .from("matches")
    .select("id, status")
    .eq("event_id", eventId)
    .neq("status", "cancelled")
    .order("sequence", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [
    { data: event },
    { count: playerCount },
    { count: teamCount },
    { data: currentMatch },
    {
      data: { user },
    },
  ] = await Promise.all([
    eventCall,
    playerCountCall,
    teamCountCall,
    currentMatchCall,
    supabase.auth.getUser(),
  ]);

  return { event, playerCount, teamCount, currentMatch, userId: user?.id };
}

export default async function EventDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { event, playerCount, teamCount, currentMatch, userId } =
    await getData(id);

  if (!event) notFound();

  const isOwner = userId === event.owner_id;
  const activeMatchId =
    currentMatch && (currentMatch.status === "running" || currentMatch.status === "paused")
      ? currentMatch.id
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{event.name}</h1>
          <p className="text-sm text-muted-foreground">
            {event.location || "Local a definir"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{eventStatusLabel[event.status]}</Badge>
          {isOwner && (
            <Button
              render={<Link href={`/events/${id}/edit`} />}
              nativeButton={false}
              variant="ghost"
              size="icon"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {!isOwner && (
        <p className="text-xs text-muted-foreground">
          Você tá vendo esse evento como convidado — só o dono pode apitar e
          editar.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarClock className="h-4 w-4 text-apito-yellow" />
          {event.scheduled_at
            ? formatEventDateTime(event.scheduled_at)
            : "Data a definir"}
        </span>
        <span className="flex items-center gap-1.5">
          <Shirt className="h-4 w-4 text-apito-yellow" />
          {event.team_size} por time
          {event.has_goalkeeper ? " + goleiro" : ""}
        </span>
      </div>

      {isOwner ? (
        <div className="flex flex-wrap items-center gap-2">
          {event.status === "draft" && <StartEventButton eventId={id} />}
          {event.status === "running" && (
            <FinishEventButton eventId={id} activeMatchId={activeMatchId} />
          )}
          <ShareEventButton eventId={id} eventName={event.name} />
          <CopyInviteLinkButton eventId={id} />
        </div>
      ) : (
        <LeaveEventButton eventId={id} />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={`/events/${id}/players`}
          className="flex items-center gap-3 rounded-2xl border border-white/10 p-4 hover:border-apito-yellow/50"
        >
          <Users className="h-5 w-5 text-apito-yellow" />
          <div>
            <p className="font-semibold">Jogadores</p>
            <p className="text-sm text-muted-foreground">
              {playerCount ?? 0} cadastrado(s)
            </p>
          </div>
        </Link>

        <Link
          href={`/events/${id}/teams`}
          className="flex items-center gap-3 rounded-2xl border border-white/10 p-4 hover:border-apito-yellow/50"
        >
          <Shirt className="h-5 w-5 text-apito-yellow" />
          <div>
            <p className="font-semibold">Banco</p>
            <p className="text-sm text-muted-foreground">
              {teamCount ?? 0} time(s)
            </p>
          </div>
        </Link>

        {currentMatch && event.status !== "finished" && (
          <Link
            href={`/events/${id}/match/${currentMatch.id}`}
            className="flex items-center gap-3 rounded-2xl border border-apito-yellow/50 bg-apito-yellow/10 p-4 sm:col-span-2"
          >
            <PlayCircle className="h-5 w-5 text-apito-yellow" />
            <div>
              <p className="font-semibold">
                {currentMatch.status === "finished"
                  ? "Escolher próxima partida"
                  : "Voltar pra partida"}
              </p>
              <p className="text-sm text-muted-foreground">
                {currentMatch.status === "finished"
                  ? "A última partida acabou — falta apitar a próxima."
                  : "Tem uma partida rolando ou pausada agora."}
              </p>
            </div>
          </Link>
        )}

        <Link
          href={`/events/${id}/summary`}
          className="flex items-center gap-3 rounded-2xl border border-white/10 p-4 hover:border-apito-yellow/50 sm:col-span-2"
        >
          <ScrollText className="h-5 w-5 text-apito-yellow" />
          <div>
            <p className="font-semibold">Súmula</p>
            <p className="text-sm text-muted-foreground">
              Classificação, artilharia e destaques.
            </p>
          </div>
        </Link>
      </div>

      <Button
        render={<Link href={`/events/${id}/teams`} />}
        nativeButton={false}
        variant="outline"
      >
        Ir pro banco de times
      </Button>
    </div>
  );
}

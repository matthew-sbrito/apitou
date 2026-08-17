import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatEventDateTime } from "@/lib/format-date";
import { eventStatusLabel } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { CalendarClock, LocationEdit, Plus } from "lucide-react";
import Link from "next/link";

export default async function EventsPage() {
  const supabase = await createClient();
  const [
    { data: events },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Suas peladas
        </h1>
        <Button render={<Link href="/events/new" />} nativeButton={false}>
          <Plus className="h-4 w-4" />
          Nova pelada
        </Button>
      </div>

      {!events || events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-muted-foreground">
          Nenhuma pelada ainda. Bora criar a primeira?
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/events/${event.id}`}
                className="flex items-center justify-between rounded-2xl border border-white/10 p-4 transition-colors hover:border-apito-yellow/50"
              >
                <div className="flex flex-col gap-1">
                  <p className="font-semibold">{event.name}</p>
                  <div className="flex items-center gap-1 ">
                    <LocationEdit className="h-4 w-4 text-apito-yellow" />
                    <span className="text-sm text-muted-foreground">
                      {event.location || "Local a definir"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 ">
                    <CalendarClock className="h-4 w-4 text-apito-yellow" />
                    <span className="text-sm text-muted-foreground">
                      {event.scheduled_at
                        ? formatEventDateTime(event.scheduled_at)
                        : "Data a definir"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {event.owner_id !== user?.id && (
                    <Badge variant="outline">Convidado</Badge>
                  )}
                  <Badge variant="secondary">
                    {eventStatusLabel[event.status]}
                  </Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

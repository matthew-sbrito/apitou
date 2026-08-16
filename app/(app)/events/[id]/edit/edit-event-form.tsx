"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventForm } from "@/components/form/event-form";
import { StartEventButton } from "@/components/event/start-event-button";
import { eventStatusLabel } from "@/lib/labels";
import { updateEvent } from "../actions";
import type { Event } from "@/types/database";

export function EditEventForm({ event }: { event: Event }) {
  return (
    <div className="flex flex-col gap-6">
      <Card className="border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">Editar pelada</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ajusta o que precisar — dá pra mudar até em cima da hora.
            </p>
          </div>
          <Badge variant="secondary">{eventStatusLabel[event.status]}</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {event.status === "finished" ? (
            <p className="rounded-xl border border-white/10 bg-card px-4 py-3 text-sm text-muted-foreground">
              Evento encerrado — não dá mais pra editar, só consultar a
              súmula.
            </p>
          ) : (
            <>
              <EventForm
                defaultValues={{
                  name: event.name,
                  location: event.location ?? "",
                  scheduled_at: event.scheduled_at ?? "",
                  team_size: event.team_size,
                  has_goalkeeper: event.has_goalkeeper,
                }}
                onSubmit={(values) => updateEvent(event.id, values)}
                submitLabel="Salvar alterações"
                submittingLabel="Salvando..."
              />

              {event.status === "draft" && (
                <div className="rounded-xl border border-white/10 p-4">
                  <p className="mb-3 text-sm text-muted-foreground">
                    A pelada ainda tá em rascunho. Pode marcar como rolando a
                    qualquer momento — antes ou depois do horário combinado,
                    sem problema.
                  </p>
                  <StartEventButton eventId={event.id} />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

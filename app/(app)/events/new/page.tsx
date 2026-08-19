import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventForm } from "@/components/form/event-form";
import { createEvent } from "../actions";

export default function NewEventPage() {
  return (
    <Card className="border-white/10">
      <CardHeader>
        <CardTitle className="text-xl">Nova pelada</CardTitle>
        <p className="text-sm text-muted-foreground">
          Configura o básico — dá pra ajustar tudo depois.
        </p>
      </CardHeader>
      <CardContent>
        <EventForm
          defaultValues={{
            name: "",
            location: "",
            latitude: null,
            longitude: null,
            scheduled_at: "",
            team_size: 5,
            has_goalkeeper: true,
            drawRule: "defender_leaves",
            maxReign: null,
            matchDurationMs: null,
            goalLimit: null,
          }}
          onSubmit={createEvent}
          submitLabel="Criar pelada"
          submittingLabel="Criando..."
        />
      </CardContent>
    </Card>
  );
}

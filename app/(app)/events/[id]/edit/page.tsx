import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditEventForm } from "./edit-event-form";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { event, user } = await getData(id);

  if (!event) notFound();

  return <EditEventForm event={event} isOwner={user?.id === event.owner_id} />;
}

async function getData(id: string) {
  const supabase = await createClient();
  const [
    { data: event },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).single(),
    supabase.auth.getUser(),
  ]);

  return { event, user };
}

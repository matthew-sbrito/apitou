import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditEventForm } from "./edit-event-form";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("*").eq("id", id).single();

  if (!event) notFound();

  return <EditEventForm event={event} />;
}

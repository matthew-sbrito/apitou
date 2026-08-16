import { EventChrome } from "@/components/layout/event-chrome";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <EventChrome eventId={id}>{children}</EventChrome>;
}

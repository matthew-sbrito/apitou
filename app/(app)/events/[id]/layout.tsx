import { EventNav } from "@/components/layout/event-nav";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <EventNav eventId={id} />
      {children}
    </>
  );
}

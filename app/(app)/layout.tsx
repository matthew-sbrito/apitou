import { AppHeader } from "@/components/layout/app-header";
import { AppHeaderGate } from "@/components/layout/app-header-gate";
import { QueryProvider } from "@/components/providers/query-provider";
import { SessionKeeper } from "@/components/providers/session-keeper";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <QueryProvider>
      <SessionKeeper />
      <div className="flex min-h-full flex-1 flex-col">
        <AppHeaderGate>
          <AppHeader />
        </AppHeaderGate>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>
      </div>
    </QueryProvider>
  );
}

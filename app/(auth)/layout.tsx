import { Logo } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/events");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 sm:gap-6 px-6">
      <Link href="/">
        <Logo
          className="flex-col gap-1"
          imageClassName="h-14 sm:h-18"
          wordClassName="text-xl sm:text-3xl"
        />
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

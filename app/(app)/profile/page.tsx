import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/layout/logout-button";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("custom_name, rating")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-white/10">
        <CardHeader>
          <CardTitle className="text-xl">Seu perfil</CardTitle>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </CardHeader>
        <CardContent>
          <ProfileForm
            defaultValues={{
              custom_name:
                profile?.custom_name ?? (user.user_metadata?.name as string) ?? "",
              rating: profile?.rating ?? undefined,
            }}
          />
        </CardContent>
      </Card>

      <LogoutButton />
    </div>
  );
}

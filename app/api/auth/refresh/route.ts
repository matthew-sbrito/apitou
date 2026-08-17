import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();
  return NextResponse.json({ ok: !error && !!data.session });
}

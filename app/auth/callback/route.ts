import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ensureProfile } from "@/lib/ensure-profile";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  if (!code) return NextResponse.redirect(`${origin}/auth`);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error.message)}`);

  try { await ensureProfile(); } catch { return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent("Profile creation failed")}`); }
  return NextResponse.redirect(`${origin}${next}`);
}

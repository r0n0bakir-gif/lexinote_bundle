import { ensureProfile } from "@/lib/ensure-profile";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { normalizeTheme } from "@/lib/theme";

export async function GET() {
  try {
    const user = await ensureProfile();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, display_name, theme")
      .eq("id", user.id)
      .single();

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 400 });
    }

    return Response.json({
      ok: true,
      profile: {
        id: data.id,
        email: data.email,
        displayName: data.display_name,
        theme: normalizeTheme(data.theme),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await ensureProfile();
    const supabase = await createSupabaseServerClient();
    const body = await req.json();
    const theme = normalizeTheme(body?.theme);

    const { error } = await supabase
      .from("profiles")
      .update({ theme })
      .eq("id", user.id);

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 400 });
    }

    return Response.json({ ok: true, profile: { id: user.id, theme } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}

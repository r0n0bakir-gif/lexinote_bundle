import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function ensureProfile() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing?.id) return user;

  const email = user.email ?? null;
  const displayName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    email?.split("@")[0] ||
    "Learner";

  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null;

  const { error: insertError } = await supabase.from("profiles").insert({
    id: user.id,
    email,
    display_name: displayName,
    avatar_url: avatarUrl,
    preferred_language: "de",
    theme: "cozy",
  });

  if (insertError) throw new Error(insertError.message);
  return user;
}

import { requireCurrentUser } from "@/lib/current-user";

async function getDeckSummary(supabase: any, userId: string, id: string) {
  const [deckResult, wordsResult] = await Promise.all([
    supabase
      .from("decks")
      .select("id, name, description, color, is_default")
      .eq("id", id)
      .eq("user_id", userId)
      .single(),
    supabase.from("words").select("deck_id, due_at, is_learned").eq("user_id", userId).eq("deck_id", id),
  ]);

  if (deckResult.error) throw new Error(deckResult.error.message);
  if (wordsResult.error) throw new Error(wordsResult.error.message);

  const words = wordsResult.data ?? [];
  const now = new Date().toISOString();

  return {
    id: deckResult.data.id,
    name: deckResult.data.name,
    description: deckResult.data.description,
    color: deckResult.data.color,
    isDefault: deckResult.data.is_default,
    wordCount: words.length,
    dueCount: words.filter((word: any) => !word.is_learned && word.due_at <= now).length,
  };
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, supabase } = await requireCurrentUser();
    const { id } = await context.params;
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim() || null;

    if (!name) {
      return Response.json({ ok: false, error: "Deck name is required." }, { status: 400 });
    }

    const { data: duplicate, error: duplicateError } = await supabase
      .from("decks")
      .select("id")
      .eq("user_id", user.id)
      .ilike("name", name)
      .neq("id", id)
      .maybeSingle();

    if (duplicateError) {
      return Response.json({ ok: false, error: duplicateError.message }, { status: 400 });
    }

    if (duplicate?.id) {
      return Response.json({ ok: false, error: "Another deck already uses this name." }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from("decks")
      .update({ name, description })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) {
      return Response.json({ ok: false, error: updateError.message }, { status: 400 });
    }

    const deck = await getDeckSummary(supabase, user.id, id);
    return Response.json({ ok: true, deck });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, supabase } = await requireCurrentUser();
    const { id } = await context.params;

    const { data: deck, error: deckError } = await supabase
      .from("decks")
      .select("id, is_default")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (deckError) {
      return Response.json({ ok: false, error: deckError.message }, { status: 400 });
    }

    if (deck.is_default) {
      return Response.json({ ok: false, error: "The default deck cannot be deleted." }, { status: 400 });
    }

    const { count, error: countError } = await supabase
      .from("words")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("deck_id", id);

    if (countError) {
      return Response.json({ ok: false, error: countError.message }, { status: 400 });
    }

    if ((count ?? 0) > 0) {
      return Response.json(
        { ok: false, error: "Move or delete the words in this deck before deleting it." },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase.from("decks").delete().eq("id", id).eq("user_id", user.id);
    if (deleteError) {
      return Response.json({ ok: false, error: deleteError.message }, { status: 400 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}

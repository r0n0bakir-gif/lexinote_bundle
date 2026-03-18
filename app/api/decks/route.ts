import { requireCurrentUser } from "@/lib/current-user";

function decorateDecks(decks: any[], words: any[]) {
  const now = new Date().toISOString();

  return decks.map((deck) => {
    const deckWords = words.filter((word) => word.deck_id === deck.id);
    const dueCount = deckWords.filter((word) => !word.is_learned && word.due_at <= now).length;

    return {
      id: deck.id,
      name: deck.name,
      description: deck.description,
      color: deck.color,
      isDefault: deck.is_default,
      wordCount: deckWords.length,
      dueCount,
    };
  });
}

export async function GET() {
  try {
    const { user, supabase } = await requireCurrentUser();
    const [decksResult, wordsResult] = await Promise.all([
      supabase
        .from("decks")
        .select("id, name, description, color, is_default, created_at")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true }),
      supabase.from("words").select("deck_id, due_at, is_learned").eq("user_id", user.id),
    ]);

    if (decksResult.error || wordsResult.error) {
      return Response.json(
        { ok: false, error: decksResult.error?.message || wordsResult.error?.message },
        { status: 400 }
      );
    }

    const decks = decorateDecks(decksResult.data ?? [], wordsResult.data ?? []);
    return Response.json({ ok: true, decks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const { user, supabase } = await requireCurrentUser();
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim() || null;

    if (!name) {
      return Response.json({ ok: false, error: "Deck name is required." }, { status: 400 });
    }

    const { data: existingDeck, error: existingDeckError } = await supabase
      .from("decks")
      .select("id")
      .eq("user_id", user.id)
      .ilike("name", name)
      .maybeSingle();

    if (existingDeckError) {
      return Response.json({ ok: false, error: existingDeckError.message }, { status: 400 });
    }

    if (existingDeck?.id) {
      return Response.json({ ok: false, error: "A deck with this name already exists." }, { status: 400 });
    }

    const { data: createdDeck, error: createError } = await supabase
      .from("decks")
      .insert({
        user_id: user.id,
        name,
        description,
        color: "#F3C98B",
        is_default: false,
      })
      .select("id, name, description, color, is_default")
      .single();

    if (createError) {
      return Response.json({ ok: false, error: createError.message }, { status: 400 });
    }

    return Response.json({
      ok: true,
      deck: {
        id: createdDeck.id,
        name: createdDeck.name,
        description: createdDeck.description,
        color: createdDeck.color,
        isDefault: createdDeck.is_default,
        wordCount: 0,
        dueCount: 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}

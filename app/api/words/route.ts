import { createWord } from "@/lib/word-create";
import { requireCurrentUser } from "@/lib/current-user";

export async function GET(req: Request) {
  try {
    const { user, supabase } = await requireCurrentUser();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim() ?? "";
    const deck = searchParams.get("deck")?.trim() ?? "";
    const source = searchParams.get("source")?.trim() ?? "";
    const partOfSpeech = searchParams.get("partOfSpeech")?.trim() ?? "";
    const tag = searchParams.get("tag")?.trim() ?? "";

    let builder = supabase.from("words").select(`
      id,
      german_word,
      translation,
      source,
      part_of_speech,
      gender,
      notes,
      example_sentence,
      example_translation,
      synonyms,
      antonyms,
      created_at,
      decks(id, name),
      word_tags(tag_id, tags(id, name))
    `).eq("user_id", user.id).order("created_at", { ascending: false });

    if (query) builder = builder.or(`german_word.ilike.%${query}%,translation.ilike.%${query}%,notes.ilike.%${query}%`);
    if (source && source !== "all") builder = builder.eq("source", source);
    if (partOfSpeech && partOfSpeech !== "all") builder = builder.eq("part_of_speech", partOfSpeech);

    const { data, error } = await builder;
    if (error) return Response.json({ ok: false, error: error.message }, { status: 400 });

    let words = (data ?? []).map((row: any) => ({
      id: row.id,
      germanWord: row.german_word,
      translation: row.translation ?? "—",
      source: row.source,
      partOfSpeech: row.part_of_speech,
      gender: row.gender ?? "",
      notes: row.notes ?? "",
      exampleSentence: row.example_sentence ?? "",
      exampleTranslation: row.example_translation ?? "",
      synonyms: row.synonyms ?? [],
      antonyms: row.antonyms ?? [],
      createdAt: row.created_at,
      deck: row.decks?.name ?? "Unknown Deck",
      deckId: row.decks?.id ?? null,
      tags: (row.word_tags ?? []).map((item: any) => item.tags?.name).filter(Boolean),
    }));

    if (deck && deck !== "all") words = words.filter((word) => word.deck === deck);
    if (tag && tag !== "all") words = words.filter((word) => word.tags.includes(tag));

    const decks = [...new Set((data ?? []).map((row: any) => row.decks?.name).filter(Boolean))] as string[];
    const tags = [...new Set(words.flatMap((word) => word.tags).filter(Boolean))];

    return Response.json({ ok: true, words, meta: { decks, tags } });
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
    const word = await createWord(supabase, user.id, {
      germanWord: body.germanWord,
      translation: body.translation,
      notes: body.notes,
      deckName: body.deck,
      source: body.source ?? "manual",
      partOfSpeech: body.partOfSpeech,
      gender: body.gender || null,
      tags: body.tags ?? [],
      queueAiEnrichment: body.queueAiEnrichment ?? false,
    });
    return Response.json({ ok: true, word, enriched: Boolean(body.queueAiEnrichment) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 400;
    return Response.json({ ok: false, error: message }, { status });
  }
}

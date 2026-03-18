import { requireCurrentUser } from "@/lib/current-user";
import { createWord } from "@/lib/word-create";

export async function POST(req: Request) {
  try {
    const { user, supabase } = await requireCurrentUser();
    const body = await req.json();
    const deckName =
      typeof body.deckName === "string" && body.deckName.trim() ? body.deckName.trim() : "Quick Capture";
    const queueAiEnrichment =
      typeof body.queueAiEnrichment === "boolean" ? body.queueAiEnrichment : true;
    const word = await createWord(supabase, user.id, {
      germanWord: body.germanWord,
      translation: body.translation,
      exampleSentence: body.exampleSentence,
      exampleTranslation: body.exampleTranslation,
      source: body.source,
      sourceUrl: body.sourceUrl,
      notes: body.notes,
      deckName,
      queueAiEnrichment,
      allowUpdateExisting: true,
    });
    return Response.json({
      ok: true,
      message: "Word saved to database",
      deckName,
      enriched: queueAiEnrichment,
      word,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 400;
    return Response.json({ ok: false, error: message }, { status });
  }
}

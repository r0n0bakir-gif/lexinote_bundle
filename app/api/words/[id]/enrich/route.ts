import { hasRequiredAiEnvVars } from "@/lib/env";
import { requireCurrentUser } from "@/lib/current-user";
import { generateWordEnrichment } from "@/lib/enrich-word";

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!hasRequiredAiEnvVars()) {
      return Response.json(
        { ok: false, error: "AI enrichment is unavailable until OPENAI_API_KEY is configured." },
        { status: 503 }
      );
    }

    const { user, supabase } = await requireCurrentUser();
    const { id } = await context.params;
    const { data: word, error: fetchError } = await supabase.from("words").select("id, german_word, translation, notes").eq("id", id).eq("user_id", user.id).single();
    if (fetchError) throw new Error(fetchError.message);
    const enrichment = await generateWordEnrichment({ germanWord: word.german_word, translation: word.translation, notes: word.notes });
    const { data: updated, error: updateError } = await supabase.from("words").update({ part_of_speech: enrichment.partOfSpeech, gender: enrichment.gender, article: enrichment.gender, example_sentence: enrichment.exampleSentence, example_translation: enrichment.exampleTranslation, synonyms: enrichment.synonyms, antonyms: enrichment.antonyms }).eq("id", id).eq("user_id", user.id).select("*").single();
    if (updateError) throw new Error(updateError.message);
    return Response.json({ ok: true, word: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}

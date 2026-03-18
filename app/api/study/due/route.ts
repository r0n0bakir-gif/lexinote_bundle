import { requireCurrentUser } from "@/lib/current-user";

export async function GET() {
  try {
    const { user, supabase } = await requireCurrentUser();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("words")
      .select(`
      id,
      german_word,
      translation,
      part_of_speech,
      gender,
      example_sentence,
      example_translation,
      notes,
      source,
      study_status,
      srs_interval_days,
      srs_ease_factor,
      srs_repetitions,
      due_at,
      last_reviewed_at,
      decks(name),
      word_tags(tag_id, tags(id, name))
    `)
      .eq("user_id", user.id)
      .eq("is_learned", false)
      .lte("due_at", now)
      .order("due_at", { ascending: true })
      .limit(50);

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 400 });
    }

    const words = (data ?? []).map((row: any) => ({
      id: row.id,
      germanWord: row.german_word,
      translation: row.translation ?? "",
      partOfSpeech: row.part_of_speech,
      gender: row.gender ?? "",
      exampleSentence: row.example_sentence ?? "",
      exampleTranslation: row.example_translation ?? "",
      notes: row.notes ?? "",
      source: row.source,
      studyStatus: row.study_status,
      deck: row.decks?.name ?? "Unknown Deck",
      tags: (row.word_tags ?? []).map((item: any) => item.tags?.name).filter(Boolean),
      srs: {
        intervalDays: row.srs_interval_days,
        easeFactor: Number(row.srs_ease_factor),
        repetitions: row.srs_repetitions,
        dueAt: row.due_at,
        lastReviewedAt: row.last_reviewed_at,
      },
    }));

    return Response.json({ ok: true, words, meta: { dueCount: words.length } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}

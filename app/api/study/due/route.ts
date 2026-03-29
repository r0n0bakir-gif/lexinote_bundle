import { requireCurrentUser } from "@/lib/current-user";

export async function GET(req: Request) {
  try {
    const { user, supabase } = await requireCurrentUser();
    const { searchParams } = new URL(req.url);

    // WHY: earlyHours lets the empty-queue "Review Early" CTA load cards that
    // aren't due yet but will be within the next N hours. Without this, the
    // study queue is strictly "due now only" and the empty state is a dead end.
    const earlyHoursParam = searchParams.get("earlyHours");
    const earlyHours = earlyHoursParam != null ? parseInt(earlyHoursParam, 10) : null;

    // WHY: deck param enables "Switch Deck" on the empty-queue screen — user
    // picks a different deck and the queue reloads filtered to that deck.
    const deckParam = searchParams.get("deck");

    // Compute the upper bound for due_at.
    const cutoff =
      earlyHours != null && !isNaN(earlyHours)
        ? new Date(Date.now() + earlyHours * 60 * 60 * 1000).toISOString()
        : new Date().toISOString();

    let query = supabase
      .from("words")
      .select(`
        id,
        german_word,
        translation,
        part_of_speech,
        gender,
        cefr_level,
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
      .lte("due_at", cutoff)
      .order("due_at", { ascending: true })
      .limit(50);

    // WHY: Deck filter is applied by joining through the decks table name.
    // We do a text match on the deck name rather than requiring the caller to
    // know a UUID — keeps the client API simple and readable.
    if (deckParam) {
      const { data: deckRow } = await supabase
        .from("decks")
        .select("id")
        .eq("user_id", user.id)
        .eq("name", deckParam)
        .maybeSingle();

      if (deckRow?.id) {
        query = query.eq("deck_id", deckRow.id);
      }
    }

    const { data, error } = await query;

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
      cefrLevel: row.cefr_level ?? null,
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

    // WHY: nextDueAt tells the empty-queue screen how many hours until the
    // next card becomes due, so it can show "Next review in X hours" instead
    // of a generic "nothing to do" message.
    let nextDueAt: string | null = null;
    if (words.length === 0) {
      const { data: nextCard } = await supabase
        .from("words")
        .select("due_at")
        .eq("user_id", user.id)
        .eq("is_learned", false)
        .gt("due_at", new Date().toISOString())
        .order("due_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      nextDueAt = nextCard?.due_at ?? null;
    }

    return Response.json({
      ok: true,
      words,
      meta: { dueCount: words.length, nextDueAt },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}

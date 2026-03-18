import { inferGender, inferPartOfSpeech, normalizeWord, cleanWord } from "@/lib/word-normalize";
import { generateWordEnrichment } from "@/lib/enrich-word";

export type CreateWordInput = {
  germanWord: string;
  translation?: string | null;
  exampleSentence?: string | null;
  exampleTranslation?: string | null;
  source?: "manual" | "linguee" | "pons" | "verbformen" | "clipboard";
  sourceUrl?: string | null;
  notes?: string | null;
  deckName?: string | null;
  partOfSpeech?: "noun" | "verb" | "adjective" | "adverb" | "phrase" | "other";
  gender?: "der" | "die" | "das" | null;
  tags?: string[];
  queueAiEnrichment?: boolean;
  allowUpdateExisting?: boolean;
};

async function getOrCreateDeckByName(supabase: any, userId: string, deckName?: string | null) {
  const targetName = deckName?.trim() || "Quick Capture";
  const { data: existingDeck, error: existingDeckError } = await supabase
    .from("decks")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", targetName)
    .maybeSingle();
  if (existingDeckError) throw new Error(existingDeckError.message);
  if (existingDeck?.id) return existingDeck.id;

  const { data: newDeck, error: newDeckError } = await supabase
    .from("decks")
    .insert({ user_id: userId, name: targetName, description: null, color: "#F3C98B", is_default: targetName === "Quick Capture" })
    .select("id")
    .single();
  if (newDeckError) throw new Error(newDeckError.message);
  return newDeck.id;
}

async function getOrCreateTags(supabase: any, userId: string, tags: string[] = []) {
  const cleanTags = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
  const results: { id: string; name: string }[] = [];
  for (const tagName of cleanTags) {
    const { data: existingTag, error: existingTagError } = await supabase.from("tags").select("id,name").eq("user_id", userId).ilike("name", tagName).maybeSingle();
    if (existingTagError) throw new Error(existingTagError.message);
    if (existingTag?.id) results.push(existingTag);
    else {
      const { data: newTag, error: newTagError } = await supabase.from("tags").insert({ user_id: userId, name: tagName, color: null }).select("id,name").single();
      if (newTagError) throw new Error(newTagError.message);
      results.push(newTag);
    }
  }
  return results;
}

async function attachTagsToWord(supabase: any, wordId: string, tagIds: string[]) {
  if (!tagIds.length) return;
  const { error } = await supabase.from("word_tags").insert(tagIds.map((tagId) => ({ word_id: wordId, tag_id: tagId })));
  if (error) throw new Error(error.message);
}

async function incrementWordsAddedToday(supabase: any, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing, error: fetchError } = await supabase.from("daily_stats").select("id, words_added").eq("user_id", userId).eq("stat_date", today).maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!existing) {
    const { error: insertError } = await supabase.from("daily_stats").insert({ user_id: userId, stat_date: today, words_added: 1, reviews_done: 0, minutes_studied: 0, streak_day: true });
    if (insertError) throw new Error(insertError.message);
    return;
  }
  const { error: updateError } = await supabase.from("daily_stats").update({ words_added: existing.words_added + 1, streak_day: true }).eq("id", existing.id);
  if (updateError) throw new Error(updateError.message);
}

export async function createWord(supabase: any, userId: string, input: CreateWordInput) {
  const germanWord = cleanWord(input.germanWord);
  if (!germanWord) throw new Error("German word is required.");

  const normalizedWord = normalizeWord(germanWord);
  const deckId = await getOrCreateDeckByName(supabase, userId, input.deckName);
  const finalGender = input.gender === undefined ? inferGender(germanWord) : input.gender;
  const finalPartOfSpeech = input.partOfSpeech ?? inferPartOfSpeech(germanWord);

  const { data: existingWord, error: existingWordError } = await supabase
    .from("words")
    .select("id, german_word, translation, example_sentence, example_translation, source_url")
    .eq("user_id", userId)
    .eq("deck_id", deckId)
    .eq("normalized_word", normalizedWord)
    .maybeSingle();
  if (existingWordError) throw new Error(existingWordError.message);
  if (existingWord) {
    if (!input.allowUpdateExisting) {
      throw new Error(`Word already saved: ${existingWord.german_word}`);
    }

    const updates = {
      translation: input.translation?.trim() || existingWord.translation || null,
      example_sentence: input.exampleSentence?.trim() || existingWord.example_sentence || null,
      example_translation: input.exampleTranslation?.trim() || existingWord.example_translation || null,
      source_url: input.sourceUrl ?? existingWord.source_url ?? null,
      notes: input.notes?.trim() || null,
    };

    const { data: updatedWord, error: updateWordError } = await supabase
      .from("words")
      .update(updates)
      .eq("id", existingWord.id)
      .select("id, german_word, translation, source, part_of_speech, gender, example_sentence, example_translation, synonyms, antonyms, notes, created_at")
      .single();

    if (updateWordError) throw new Error(updateWordError.message);

    return { ...updatedWord, tags: await getOrCreateTags(supabase, userId, input.tags ?? []) };
  }

  let enrichment: any = null;
  if (input.queueAiEnrichment) {
    try {
      enrichment = await generateWordEnrichment({ germanWord, translation: input.translation, notes: input.notes });
    } catch {}
  }

  const { data: createdWord, error: createWordError } = await supabase.from("words").insert({
    user_id: userId,
    deck_id: deckId,
    german_word: germanWord,
    normalized_word: normalizedWord,
    translation: input.translation?.trim() || null,
    source: input.source ?? "manual",
    source_url: input.sourceUrl ?? null,
    part_of_speech: enrichment?.partOfSpeech ?? finalPartOfSpeech,
    gender: enrichment?.gender ?? finalGender,
    article: enrichment?.gender ?? finalGender,
    cefr_level: null,
    example_sentence: enrichment?.exampleSentence ?? (input.exampleSentence?.trim() || null),
    example_translation: enrichment?.exampleTranslation ?? (input.exampleTranslation?.trim() || null),
    synonyms: enrichment?.synonyms ?? [],
    antonyms: enrichment?.antonyms ?? [],
    notes: input.notes?.trim() || null,
    is_learned: false,
    study_status: "new",
    srs_interval_days: 0,
    srs_ease_factor: 2.5,
    srs_repetitions: 0,
    due_at: new Date().toISOString(),
    last_reviewed_at: null,
  }).select("id, german_word, translation, source, part_of_speech, gender, example_sentence, example_translation, synonyms, antonyms, notes, created_at").single();
  if (createWordError) throw new Error(createWordError.message);

  const tagRows = await getOrCreateTags(supabase, userId, input.tags ?? []);
  await attachTagsToWord(supabase, createdWord.id, tagRows.map((tag) => tag.id));
  await incrementWordsAddedToday(supabase, userId);

  return { ...createdWord, tags: tagRows };
}

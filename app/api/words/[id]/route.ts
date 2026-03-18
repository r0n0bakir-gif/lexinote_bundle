import { requireCurrentUser } from "@/lib/current-user";
import { cleanWord, normalizeWord } from "@/lib/word-normalize";

async function getOrCreateDeckByName(supabase: any, userId: string, deckName: string) {
  const trimmedName = deckName.trim();
  const { data: existingDeck, error: existingDeckError } = await supabase.from("decks").select("id").eq("user_id", userId).ilike("name", trimmedName).maybeSingle();
  if (existingDeckError) throw new Error(existingDeckError.message);
  if (existingDeck?.id) return existingDeck.id;
  const { data: newDeck, error: newDeckError } = await supabase.from("decks").insert({ user_id: userId, name: trimmedName, description: null, color: "#F3C98B", is_default: false }).select("id").single();
  if (newDeckError) throw new Error(newDeckError.message);
  return newDeck.id;
}

async function syncWordTags(supabase: any, wordId: string, userId: string, tagNames: string[]) {
  const cleanTagNames = [...new Set(tagNames.map((tag) => tag.trim()).filter(Boolean))];
  const { error: deleteError } = await supabase.from("word_tags").delete().eq("word_id", wordId);
  if (deleteError) throw new Error(deleteError.message);
  if (!cleanTagNames.length) return;
  const tagIds: string[] = [];
  for (const tagName of cleanTagNames) {
    const { data: existingTag, error: existingTagError } = await supabase.from("tags").select("id").eq("user_id", userId).ilike("name", tagName).maybeSingle();
    if (existingTagError) throw new Error(existingTagError.message);
    if (existingTag?.id) tagIds.push(existingTag.id);
    else {
      const { data: newTag, error: newTagError } = await supabase.from("tags").insert({ user_id: userId, name: tagName, color: null }).select("id").single();
      if (newTagError) throw new Error(newTagError.message);
      tagIds.push(newTag.id);
    }
  }
  if (tagIds.length) {
    const { error: insertError } = await supabase.from("word_tags").insert(tagIds.map((tagId) => ({ word_id: wordId, tag_id: tagId })));
    if (insertError) throw new Error(insertError.message);
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, supabase } = await requireCurrentUser();
    const { id } = await context.params;
    const body = await req.json();
    const germanWord = cleanWord(body.germanWord ?? "");
    if (!germanWord) return Response.json({ ok: false, error: "German word is required." }, { status: 400 });
    const deckId = body.deck ? await getOrCreateDeckByName(supabase, user.id, body.deck) : null;
    const { error: updateError } = await supabase.from("words").update({ german_word: germanWord, normalized_word: normalizeWord(germanWord), translation: body.translation?.trim() || null, part_of_speech: body.partOfSpeech || "other", gender: body.gender || null, notes: body.notes?.trim() || null, source: body.source || "manual", deck_id: deckId }).eq("id", id).eq("user_id", user.id);
    if (updateError) return Response.json({ ok: false, error: updateError.message }, { status: 400 });
    await syncWordTags(supabase, id, user.id, body.tags ?? []);
    return Response.json({ ok: true });
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
    const { error } = await supabase.from("words").delete().eq("id", id).eq("user_id", user.id);
    if (error) return Response.json({ ok: false, error: error.message }, { status: 400 });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}

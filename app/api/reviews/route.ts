import { requireCurrentUser } from "@/lib/current-user";
import { deriveStudyStatus, getNextSRSState, type ReviewRating } from "@/lib/srs";

async function incrementDailyReviewCount(supabase: any, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing, error: fetchError } = await supabase.from("daily_stats").select("id, reviews_done").eq("user_id", userId).eq("stat_date", today).maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!existing) {
    const { error: insertError } = await supabase.from("daily_stats").insert({ user_id: userId, stat_date: today, words_added: 0, reviews_done: 1, minutes_studied: 0, streak_day: true });
    if (insertError) throw new Error(insertError.message);
    return;
  }
  const { error: updateError } = await supabase.from("daily_stats").update({ reviews_done: existing.reviews_done + 1, streak_day: true }).eq("id", existing.id);
  if (updateError) throw new Error(updateError.message);
}

export async function POST(req: Request) {
  try {
    const { user, supabase } = await requireCurrentUser();
    const body = await req.json();
    const wordId = body.wordId as string;
    const rating = body.rating as ReviewRating;
    if (!wordId) return Response.json({ ok: false, error: "wordId is required." }, { status: 400 });
    if (!rating || !["again", "hard", "good", "easy"].includes(rating)) return Response.json({ ok: false, error: "Valid rating is required." }, { status: 400 });

    const { data: word, error: fetchError } = await supabase.from("words").select("id, srs_interval_days, srs_ease_factor, srs_repetitions, due_at, last_reviewed_at").eq("id", wordId).eq("user_id", user.id).single();
    if (fetchError) return Response.json({ ok: false, error: fetchError.message }, { status: 400 });

    const nextState = getNextSRSState({ intervalDays: word.srs_interval_days, easeFactor: Number(word.srs_ease_factor), repetitions: word.srs_repetitions, dueAt: word.due_at, lastReviewedAt: word.last_reviewed_at }, rating);
    const nextStudyStatus = deriveStudyStatus(nextState.repetitions, nextState.intervalDays);
    const nextIsLearned = nextStudyStatus === "learned";

    const { error: updateError } = await supabase.from("words").update({ srs_interval_days: nextState.intervalDays, srs_ease_factor: nextState.easeFactor, srs_repetitions: nextState.repetitions, due_at: nextState.dueAt, last_reviewed_at: nextState.lastReviewedAt, study_status: nextStudyStatus, is_learned: nextIsLearned }).eq("id", wordId).eq("user_id", user.id);
    if (updateError) return Response.json({ ok: false, error: updateError.message }, { status: 400 });

    const { error: reviewInsertError } = await supabase.from("reviews").insert({ user_id: user.id, word_id: wordId, rating, previous_interval_days: word.srs_interval_days, next_interval_days: nextState.intervalDays });
    if (reviewInsertError) return Response.json({ ok: false, error: reviewInsertError.message }, { status: 400 });

    await incrementDailyReviewCount(supabase, user.id);
    return Response.json({ ok: true, review: { wordId, rating, nextIntervalDays: nextState.intervalDays, nextDueAt: nextState.dueAt, studyStatus: nextStudyStatus } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}

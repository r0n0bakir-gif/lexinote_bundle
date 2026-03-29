import { requireCurrentUser } from "@/lib/current-user";
import { deriveStudyStatus, getNextSRSState, type ReviewRating } from "@/lib/srs";

export async function POST(req: Request) {
  try {
    const { user, supabase } = await requireCurrentUser();
    const body = await req.json();

    const wordId = body.wordId as string;
    const rating = body.rating as ReviewRating;

    // WHY: minutesStudied is sent by the FlashcardStudy component which tracks
    // elapsed time per card. It accumulates into daily_stats via the RPC below.
    // We clamp it to a sane ceiling (10 min/card) to guard against bogus values
    // from clock drift, browser tab sleeping, or malicious clients.
    const minutesStudied = Math.min(
      typeof body.minutesStudied === "number" && body.minutesStudied >= 0
        ? Math.round(body.minutesStudied * 10) / 10 // round to 1 decimal
        : 0,
      10 // WHY: 10-minute cap — no single card review should exceed this.
    );

    if (!wordId) {
      return Response.json({ ok: false, error: "wordId is required." }, { status: 400 });
    }
    if (!rating || !["again", "hard", "good", "easy"].includes(rating)) {
      return Response.json(
        { ok: false, error: "Valid rating is required (again, hard, good, or easy)." },
        { status: 400 }
      );
    }

    // ── Fetch current SRS state ────────────────────────────────────────────
    const { data: word, error: fetchError } = await supabase
      .from("words")
      .select("id, srs_interval_days, srs_ease_factor, srs_repetitions, due_at, last_reviewed_at")
      .eq("id", wordId)
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      return Response.json({ ok: false, error: fetchError.message }, { status: 400 });
    }

    // ── Compute next SRS state ─────────────────────────────────────────────
    const nextState = getNextSRSState(
      {
        intervalDays: word.srs_interval_days,
        easeFactor: Number(word.srs_ease_factor),
        repetitions: word.srs_repetitions,
        dueAt: word.due_at,
        lastReviewedAt: word.last_reviewed_at,
      },
      rating
    );
    const nextStudyStatus = deriveStudyStatus(nextState.repetitions, nextState.intervalDays);
    const nextIsLearned = nextStudyStatus === "learned";

    // ── Persist updated word state ─────────────────────────────────────────
    const { error: updateError } = await supabase
      .from("words")
      .update({
        srs_interval_days: nextState.intervalDays,
        srs_ease_factor: nextState.easeFactor,
        srs_repetitions: nextState.repetitions,
        due_at: nextState.dueAt,
        last_reviewed_at: nextState.lastReviewedAt,
        study_status: nextStudyStatus,
        is_learned: nextIsLearned,
      })
      .eq("id", wordId)
      .eq("user_id", user.id);

    if (updateError) {
      return Response.json({ ok: false, error: updateError.message }, { status: 400 });
    }

    // ── Write review history row ───────────────────────────────────────────
    const { error: reviewInsertError } = await supabase.from("reviews").insert({
      user_id: user.id,
      word_id: wordId,
      rating,
      previous_interval_days: word.srs_interval_days,
      next_interval_days: nextState.intervalDays,
    });

    if (reviewInsertError) {
      return Response.json({ ok: false, error: reviewInsertError.message }, { status: 400 });
    }

    // ── Update daily stats via atomic RPC ──────────────────────────────────
    // WHY: Using the increment_daily_stats RPC (defined in migration
    // 20250323000002) instead of the old SELECT → INSERT/UPDATE pattern.
    // The old code had a TOCTOU race where concurrent review submissions for
    // the same user+date both read the same count and both wrote count+1,
    // silently losing one increment. ON CONFLICT DO UPDATE in the RPC is a
    // single atomic statement that correctly accumulates from any concurrency.
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const { error: statsError } = await supabase.rpc("increment_daily_stats", {
      p_user_id: user.id,
      p_date: today,
      p_cards_reviewed: 1,
      p_minutes_studied: minutesStudied,
    });

    if (statsError) {
      // WHY: Non-fatal — a stats tracking failure must not block the review
      // from being recorded. Log it server-side for ops visibility.
      console.error("[LexiNote/Stats] increment_daily_stats RPC failed:", statsError.message);
    }

    return Response.json({
      ok: true,
      review: {
        wordId,
        rating,
        nextIntervalDays: nextState.intervalDays,
        nextDueAt: nextState.dueAt,
        studyStatus: nextStudyStatus,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}

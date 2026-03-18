import { requireCurrentUser } from "@/lib/current-user";

type DailyStatRow = {
  stat_date: string;
  words_added: number;
  reviews_done: number;
  streak_day: boolean;
};

function formatDateKey(date: Date) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function calculateCurrentStreak(rows: DailyStatRow[]) {
  if (!rows.length) return 0;
  const streakDays = new Set(
    rows
      .filter((row) => row.streak_day || row.reviews_done > 0 || row.words_added > 0)
      .map((row) => row.stat_date)
  );
  let streak = 0;
  const current = new Date();
  while (true) {
    const key = formatDateKey(current);
    if (!streakDays.has(key)) break;
    streak += 1;
    current.setUTCDate(current.getUTCDate() - 1);
  }
  return streak;
}

function buildDateSeries(rows: DailyStatRow[], days: number) {
  const rowMap = new Map(rows.map((row) => [row.stat_date, row]));
  const series: DailyStatRow[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - offset);
    const key = formatDateKey(date);
    const existing = rowMap.get(key);

    series.push(
      existing ?? {
        stat_date: key,
        words_added: 0,
        reviews_done: 0,
        streak_day: false,
      }
    );
  }

  return series;
}

function buildHeatmap(rows: DailyStatRow[]) {
  const maxTotal = Math.max(1, ...rows.map((row) => row.reviews_done + row.words_added));

  return rows.map((row) => ({
    date: row.stat_date,
    reviewsDone: row.reviews_done,
    wordsAdded: row.words_added,
    intensity: (row.reviews_done + row.words_added) / maxTotal,
  }));
}

export async function GET() {
  try {
    const { user, supabase } = await requireCurrentUser();
    const now = new Date().toISOString();
    const today = new Date().toISOString().slice(0, 10);

    const [
      wordsResult,
      todayStatsResult,
      recentStatsResult,
      recentReviewsResult,
      decksResult,
      ratingsResult,
    ] = await Promise.all([
      supabase
        .from("words")
        .select("id, is_learned, study_status, due_at, deck_id, decks(id, name)")
        .eq("user_id", user.id),
      supabase
        .from("daily_stats")
        .select("stat_date, words_added, reviews_done, streak_day")
        .eq("user_id", user.id)
        .eq("stat_date", today)
        .maybeSingle(),
      supabase
        .from("daily_stats")
        .select("stat_date, words_added, reviews_done, streak_day")
        .eq("user_id", user.id)
        .order("stat_date", { ascending: false })
        .limit(90),
      supabase
        .from("reviews")
        .select("id, rating, reviewed_at, words(german_word)")
        .eq("user_id", user.id)
        .order("reviewed_at", { ascending: false })
        .limit(8),
      supabase.from("decks").select("id, name").eq("user_id", user.id),
      supabase
        .from("reviews")
        .select("rating, reviewed_at")
        .eq("user_id", user.id)
        .order("reviewed_at", { ascending: false })
        .limit(120),
    ]);

    if (
      wordsResult.error ||
      todayStatsResult.error ||
      recentStatsResult.error ||
      recentReviewsResult.error ||
      decksResult.error ||
      ratingsResult.error
    ) {
      return Response.json(
        {
          ok: false,
          error:
            wordsResult.error?.message ||
            todayStatsResult.error?.message ||
            recentStatsResult.error?.message ||
            recentReviewsResult.error?.message ||
            decksResult.error?.message ||
            ratingsResult.error?.message,
        },
        { status: 400 }
      );
    }

    const wordRows = wordsResult.data ?? [];
    const dueCount = wordRows.filter((row: any) => !row.is_learned && row.due_at <= now).length;
    const totalWords = wordRows.length;
    const learnedWords = wordRows.filter((row: any) => row.study_status === "learned" || row.is_learned).length;
    const learningWords = wordRows.filter((row: any) => row.study_status === "learning").length;
    const reviewWords = wordRows.filter((row: any) => row.study_status === "review").length;
    const todayStats =
      todayStatsResult.data ?? { stat_date: today, words_added: 0, reviews_done: 0, streak_day: false };
    const recentStats = (recentStatsResult.data ?? []) as DailyStatRow[];
    const streak = calculateCurrentStreak(recentStats);
    const recentActivity = (recentReviewsResult.data ?? []).map((row: any) => ({
      id: row.id,
      rating: row.rating,
      reviewedAt: row.reviewed_at,
      germanWord: row.words?.german_word ?? "Unknown word",
    }));
    const decks = (decksResult.data ?? []).map((deck: any) => ({ id: deck.id, name: deck.name }));

    const trendRows = buildDateSeries(recentStats, 14);
    const heatmapRows = buildDateSeries(recentStats, 42);
    const trend = trendRows.map((row) => ({
      date: row.stat_date,
      reviewsDone: row.reviews_done,
      wordsAdded: row.words_added,
    }));
    const heatmap = buildHeatmap(heatmapRows);

    const ratings = ratingsResult.data ?? [];
    const ratingCounts = {
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
    };
    for (const rating of ratings) {
      if (rating.rating in ratingCounts) {
        ratingCounts[rating.rating as keyof typeof ratingCounts] += 1;
      }
    }
    const ratingBreakdown = (["again", "hard", "good", "easy"] as const).map((rating) => ({
      rating,
      count: ratingCounts[rating],
    }));

    const deckProgress = decks.map((deck) => {
      const deckWords = wordRows.filter((row: any) => row.deck_id === deck.id);
      return {
        id: deck.id,
        name: deck.name,
        totalWords: deckWords.length,
        dueCount: deckWords.filter((row: any) => !row.is_learned && row.due_at <= now).length,
        learnedCount: deckWords.filter((row: any) => row.study_status === "learned" || row.is_learned).length,
        learningCount: deckWords.filter((row: any) => row.study_status === "learning").length,
        reviewCount: deckWords.filter((row: any) => row.study_status === "review").length,
      };
    });

    const last14 = trendRows;
    const last7 = trendRows.slice(-7);
    const activeDaysLast14 = last14.filter((row) => row.reviews_done > 0 || row.words_added > 0).length;
    const reviewsLast7 = last7.reduce((sum, row) => sum + row.reviews_done, 0);
    const wordsAddedLast7 = last7.reduce((sum, row) => sum + row.words_added, 0);
    const completionRate = totalWords ? Math.round((learnedWords / totalWords) * 100) : 0;

    return Response.json({
      ok: true,
      dashboard: {
        stats: {
          dueCount,
          totalWords,
          learnedWords,
          learningWords,
          reviewWords,
          todayReviews: todayStats.reviews_done,
          todayWordsAdded: todayStats.words_added,
          streak,
          deckCount: decks.length,
        },
        recentActivity,
        decks,
        trend,
        heatmap,
        ratingBreakdown,
        deckProgress,
        insights: {
          activeDaysLast14,
          reviewsLast7,
          wordsAddedLast7,
          completionRate,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}

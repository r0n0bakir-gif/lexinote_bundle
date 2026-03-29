export type StudyWord = {
  id: string;
  germanWord: string;
  translation: string;
  partOfSpeech: string;
  gender?: string;
  cefrLevel?: string | null;
  exampleSentence?: string;
  exampleTranslation?: string;
  notes?: string;
  source: string;
  studyStatus: string;
  deck: string;
  tags: string[];
  srs: {
    intervalDays: number;
    easeFactor: number;
    repetitions: number;
    dueAt: string;
    lastReviewedAt?: string | null;
  };
};

export type ReviewRating = "again" | "hard" | "good" | "easy";

export type FetchDueWordsOptions = {
  // WHY: earlyHours loads cards due within the next N hours, enabling the
  // "Review Early" CTA on the empty-queue screen without a separate endpoint.
  earlyHours?: number;
  // WHY: deck filters the queue to one named deck, powering the "Switch Deck"
  // picker on the empty-queue screen.
  deck?: string;
};

export async function fetchDueWords(options: FetchDueWordsOptions = {}) {
  const params = new URLSearchParams();
  if (options.earlyHours != null) params.set("earlyHours", String(options.earlyHours));
  if (options.deck) params.set("deck", options.deck);

  const url = `/api/study/due${params.size > 0 ? `?${params.toString()}` : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to fetch due words.");
  return data as { words: StudyWord[]; meta: { dueCount: number; nextDueAt: string | null } };
}

export async function submitReview(
  wordId: string,
  rating: ReviewRating,
  // WHY: minutesStudied is tracked per-card in the FlashcardStudy component
  // (elapsed seconds since card was shown, converted to fractional minutes)
  // and accumulated into daily_stats via the increment_daily_stats RPC.
  // Defaults to 0 so existing callers don't need to change.
  minutesStudied: number = 0
) {
  const res = await fetch("/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wordId, rating, minutesStudied }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to submit review.");
  return data.review;
}

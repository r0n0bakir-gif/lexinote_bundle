export type StudyWord = {
  id: string;
  germanWord: string;
  translation: string;
  partOfSpeech: string;
  gender?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  notes?: string;
  source: string;
  studyStatus: string;
  deck: string;
  tags: string[];
  srs: { intervalDays: number; easeFactor: number; repetitions: number; dueAt: string; lastReviewedAt?: string | null; };
};

export type ReviewRating = "again" | "hard" | "good" | "easy";

export async function fetchDueWords() {
  const res = await fetch("/api/study/due", { cache: "no-store" });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to fetch due words.");
  return data as { words: StudyWord[]; meta: { dueCount: number } };
}

export async function submitReview(wordId: string, rating: ReviewRating) {
  const res = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wordId, rating }) });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to submit review.");
  return data.review;
}

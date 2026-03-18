"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, Clock3, Sparkles, Trophy } from "lucide-react";
import { AppTopbar } from "@/components/lexinote/app-topbar";
import { FlashcardStudy } from "@/components/lexinote/flashcard-study";
import { StudySummaryCard } from "@/components/lexinote/study-summary-card";
import { fetchDueWords, type StudyWord } from "@/lib/study-fetch";

export default function StudyPage() {
  const router = useRouter();
  const [words, setWords] = useState<StudyWord[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [remainingCount, setRemainingCount] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDueWords() {
      try {
        setError(null);
        setIsLoading(true);
        const data = await fetchDueWords();
        setWords(data.words);
        setDueCount(data.meta.dueCount);
        setRemainingCount(data.meta.dueCount);
        setReviewedCount(0);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load study queue.";
        if (message === "Unauthorized") {
          router.replace("/auth");
          return;
        }
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    loadDueWords();
  }, [router]);

  return (
    <div className="app-shell">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
        <AppTopbar />

        <div className="mb-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div
            className="motion-enter rounded-[30px] border border-[color:var(--line)] bg-[color:var(--bg-elevated)] p-6 text-[color:var(--text-inverse)] shadow-[var(--shadow-lg)] backdrop-blur-xl md:p-7"
            style={{ animationDelay: "120ms" }}
          >
            <div className="eyebrow text-[color:var(--accent-gold)]">Study session</div>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight md:text-6xl">
              Make each review feel focused, calm, and a little more memorable.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--text-muted-inverse)] md:text-lg">
              Switch modes, keep the queue moving, and let LexiNote handle the schedule.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] px-4 py-2 text-sm">
                <Clock3 className="h-4 w-4 text-[color:var(--accent-gold)]" />
                {dueCount} due now
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] px-4 py-2 text-sm">
                <Brain className="h-4 w-4 text-[color:var(--accent-gold)]" />
                {words.length} cards in session
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] px-4 py-2 text-sm">
                <Sparkles className="h-4 w-4 text-[color:var(--accent-gold)]" />
                4 study modes
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div
              className="motion-enter rounded-[26px] border border-[color:var(--line)] bg-[color:var(--surface)] p-5 text-[color:var(--text)] shadow-[var(--shadow-md)]"
              style={{ animationDelay: "180ms" }}
            >
              <div className="eyebrow">Session focus</div>
              <div className="mt-3 text-xl font-semibold">
                {dueCount ? "Clear the queue while recall is warm." : "You are caught up for now."}
              </div>
              <div className="mt-2 text-sm leading-6 text-[color:var(--text-soft)]">
                {dueCount
                  ? "Keep one rhythm and rate by instinct."
                  : "You are caught up. Add words or come back later."}
              </div>
            </div>

            <div
              className="motion-enter rounded-[26px] border border-[color:var(--line)] bg-[color:var(--surface)] p-5 text-[color:var(--text)] shadow-[var(--shadow-md)]"
              style={{ animationDelay: "240ms" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="eyebrow">Reward loop</div>
                  <div className="mt-2 text-xl font-semibold">Small wins compound fast</div>
                </div>
                <Trophy className="h-5 w-5 text-[color:var(--accent)]" />
              </div>
              <div className="mt-3 text-sm leading-6 text-[color:var(--text-soft)]">
                Short sessions beat postponed perfect ones.
              </div>
            </div>
          </div>
        </div>

        <div className="motion-enter mb-6" style={{ animationDelay: "320ms" }}>
          <StudySummaryCard dueCount={dueCount} remainingCount={remainingCount} reviewedCount={reviewedCount} />
        </div>

        {error ? (
          <div className="mb-6 rounded-[24px] border border-[#d99e95] bg-[#fff1ed] px-5 py-4 text-sm text-[#9b4f42]">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div
            className="motion-enter rounded-[26px] border border-[color:var(--line)] bg-[color:var(--surface)] p-10 text-sm text-[color:var(--text-soft)] shadow-[var(--shadow-md)]"
            style={{ animationDelay: "400ms" }}
          >
            Loading study queue...
          </div>
        ) : (
          <div className="motion-enter-soft" style={{ animationDelay: "400ms" }}>
            <FlashcardStudy
              words={words}
              onSessionChange={({ remainingCount, reviewedCount }) => {
                setRemainingCount(remainingCount);
                setReviewedCount(reviewedCount);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

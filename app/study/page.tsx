"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, Clock3, Sparkles, Trophy } from "lucide-react";
import { AppTopbar } from "@/components/lexinote/app-topbar";
import { FlashcardStudy } from "@/components/lexinote/flashcard-study";
import { StudySummaryCard } from "@/components/lexinote/study-summary-card";
import { WindowPanel } from "@/components/lexinote/window-panel";
import { fetchDueWords, type StudyWord, type FetchDueWordsOptions } from "@/lib/study-fetch";
import { fetchDecks } from "@/lib/deck-fetch";
import { useTheme } from "@/components/lexinote/theme-provider";

export default function StudyPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [words, setWords] = useState<StudyWord[]>([]);
  const [deckNames, setDeckNames] = useState<string[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [remainingCount, setRemainingCount] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [nextDueAt, setNextDueAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStudyQueue = useCallback(
    async (opts: FetchDueWordsOptions = {}) => {
      try {
        setError(null);
        setIsLoading(true);

        // WHY: Fetch deck names alongside the study queue so we can pass them
        // to FlashcardStudy's empty-state "Switch Deck" picker without an
        // additional round-trip when the queue runs out.
        const [data, deckData] = await Promise.all([fetchDueWords(opts), fetchDecks()]);

        setWords(data.words);
        setDeckNames(deckData.map((d) => d.name));
        setDueCount(data.meta.dueCount);
        setRemainingCount(data.meta.dueCount);
        setNextDueAt(data.meta.nextDueAt ?? null);
        // WHY: Reset reviewed count when the queue reloads (e.g. after "Switch
        // Deck"). The count should reflect the current session, not cumulative.
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
    },
    [router]
  );

  useEffect(() => {
    loadStudyQueue();
  }, [loadStudyQueue]);

  // WHY: Reloads the queue with earlyHours=24, surfacing cards that aren't
  // technically due yet but will be within the next day. This is the backing
  // logic for the "Review Early" CTA on the empty-queue screen.
  async function handleReviewEarly() {
    await loadStudyQueue({ earlyHours: 24 });
  }

  // WHY: Reloads the queue filtered to a single named deck. Triggered by the
  // "Switch Deck" picker in the empty-queue screen. Passes deck name — the API
  // resolves the UUID internally so callers don't need to manage IDs.
  async function handleSwitchDeck(deck: string) {
    await loadStudyQueue({ deck });
  }

  if (theme === "retro") {
    return (
      <div className="retro-canvas-grid">
        {/* Left column: session info */}
        <div className="retro-canvas-col">
          <WindowPanel title="session_info.png">
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="retro-stat-row">
                <Clock3 size={12} /> {dueCount} cards due
              </div>
              <div className="retro-stat-row">
                <Brain size={12} /> {words.length} in session
              </div>
              <div className="retro-stat-row">
                <Sparkles size={12} /> 4 study modes
              </div>
              <div className="retro-stat-row">
                <Trophy size={12} /> {reviewedCount} reviewed
              </div>
            </div>
          </WindowPanel>

          <WindowPanel title="progress.psd">
            <StudySummaryCard
              dueCount={dueCount}
              remainingCount={remainingCount}
              reviewedCount={reviewedCount}
            />
          </WindowPanel>

          {error ? (
            <WindowPanel title="error.png">
              <div style={{ color: "#9b4f42", fontSize: 11 }}>{error}</div>
            </WindowPanel>
          ) : null}
        </div>

        {/* Right column: flashcards */}
        <div className="retro-canvas-col">
          <WindowPanel title="study_session.psd">
            {isLoading ? (
              <div style={{ padding: "20px 0", color: "#666", fontSize: 11 }}>Loading study queue...</div>
            ) : (
              <FlashcardStudy
                words={words}
                deckNames={deckNames}
                nextDueAt={nextDueAt}
                onSessionChange={({ remainingCount: r, reviewedCount: rc }) => {
                  setRemainingCount(r);
                  setReviewedCount(rc);
                }}
                onReviewEarly={handleReviewEarly}
                onSwitchDeck={handleSwitchDeck}
              />
            )}
          </WindowPanel>
        </div>
      </div>
    );
  }

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
          <StudySummaryCard
            dueCount={dueCount}
            remainingCount={remainingCount}
            reviewedCount={reviewedCount}
          />
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
              deckNames={deckNames}
              nextDueAt={nextDueAt}
              onSessionChange={({ remainingCount: r, reviewedCount: rc }) => {
                setRemainingCount(r);
                setReviewedCount(rc);
              }}
              onReviewEarly={handleReviewEarly}
              onSwitchDeck={handleSwitchDeck}
            />
          </div>
        )}
      </div>
    </div>
  );
}

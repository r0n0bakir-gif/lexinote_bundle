"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  CheckCircle2,
  PencilLine,
  SquareDashedBottom,
  Layers3,
  ArrowRight,
  Plus,
  RefreshCw,
  BookOpen,
  Keyboard,
  Volume2,
  Headphones,
  Bell,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { submitReview, type ReviewRating, type StudyWord } from "@/lib/study-fetch";
import { useSpeech, SPEECH_SPEEDS } from "@/hooks/useSpeech";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { cn } from "@/lib/utils";

// ── Constants ──────────────────────────────────────────────────────────────────

const ratingMeta: { value: ReviewRating; label: string; hint: string; key: string }[] = [
  { value: "again", label: "Again", hint: "Reset sooner", key: "1" },
  { value: "hard",  label: "Hard",  hint: "Small step",  key: "2" },
  { value: "good",  label: "Good",  hint: "Normal step", key: "3" },
  { value: "easy",  label: "Easy",  hint: "Bigger jump", key: "4" },
];

const studyModes = [
  { value: "flashcard",       label: "Flashcards", icon: Layers3           },
  { value: "typing",          label: "Typing",     icon: PencilLine        },
  { value: "multiple-choice", label: "Choice",     icon: Sparkles          },
  { value: "fill-in",         label: "Fill in",    icon: SquareDashedBottom},
  { value: "listening",       label: "Listening",  icon: Headphones        },
] as const;

type StudyMode = (typeof studyModes)[number]["value"];

// WHY: CEFR colors match notebook list badges for visual consistency.
const CEFR_COLORS: Record<string, string> = {
  A1: "bg-[rgba(144,200,144,0.18)] text-[#4a8a4a] border-[rgba(144,200,144,0.4)]",
  A2: "bg-[rgba(144,200,144,0.18)] text-[#4a8a4a] border-[rgba(144,200,144,0.4)]",
  B1: "bg-[rgba(210,160,60,0.18)] text-[#8a6010] border-[rgba(210,160,60,0.4)]",
  B2: "bg-[rgba(210,160,60,0.18)] text-[#8a6010] border-[rgba(210,160,60,0.4)]",
  C1: "bg-[rgba(140,100,210,0.18)] text-[#6040a0] border-[rgba(140,100,210,0.4)]",
  C2: "bg-[rgba(140,100,210,0.18)] text-[#6040a0] border-[rgba(140,100,210,0.4)]",
};

// ── Text helpers ───────────────────────────────────────────────────────────────

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripArticle(value: string) {
  return value.replace(/^(der|die|das)\s+/i, "").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getAcceptedAnswers(word: StudyWord) {
  const answers = [word.germanWord];
  const articleFree = stripArticle(word.germanWord);
  if (articleFree && articleFree !== word.germanWord) answers.push(articleFree);
  return [...new Set(answers.map(normalizeText).filter(Boolean))];
}

function isCorrectAnswer(word: StudyWord, answer: string) {
  return getAcceptedAnswers(word).includes(normalizeText(answer));
}

function getMaskedSentence(sentence: string, germanWord: string) {
  if (!sentence) return "";
  const exactPattern = new RegExp(`\\b${escapeRegExp(germanWord)}\\b`, "i");
  if (exactPattern.test(sentence)) return sentence.replace(exactPattern, "________");
  const articleFree = stripArticle(germanWord);
  if (!articleFree) return sentence;
  const basePattern = new RegExp(`\\b${escapeRegExp(articleFree)}\\b`, "i");
  if (basePattern.test(sentence)) return sentence.replace(basePattern, "________");
  return sentence;
}

function buildMultipleChoiceOptions(queue: StudyWord[], currentWord: StudyWord) {
  const distractors = queue
    .filter((w) => w.id !== currentWord.id && w.germanWord !== currentWord.germanWord)
    .slice(0, 6)
    .map((w) => w.germanWord);

  const options = [currentWord.germanWord];
  for (const distractor of distractors) {
    if (!options.includes(distractor) && options.length < 4) options.push(distractor);
  }

  return options
    .map((option, index) => ({
      option,
      sortKey: normalizeText(`${currentWord.id}-${option}-${index}`),
    }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map((item) => item.option);
}

function getPromptCopy(mode: StudyMode, currentWord: StudyWord) {
  if (mode === "typing") {
    return {
      eyebrow: "Type the German word",
      question: currentWord.translation || currentWord.exampleTranslation || "Use the clues below to recall the word.",
      helper: "Articles are optional for typed answers.",
    };
  }
  if (mode === "multiple-choice") {
    return {
      eyebrow: "Choose the correct word",
      question: currentWord.translation || currentWord.exampleTranslation || "Pick the best German match.",
      helper: "Use the translation and grammar clues to decide.",
    };
  }
  if (mode === "fill-in") {
    return {
      eyebrow: "Complete the sentence",
      question:
        getMaskedSentence(currentWord.exampleSentence || "", currentWord.germanWord) ||
        currentWord.exampleTranslation ||
        currentWord.translation ||
        "Fill in the missing German word.",
      helper: currentWord.exampleSentence
        ? "Use the sentence context to recall the missing word."
        : "Using the translation clue for this one.",
    };
  }
  if (mode === "listening") {
    return {
      eyebrow: "Listen and translate",
      question: "🔊",
      helper: "Press the speaker button to hear the word, then reveal the answer.",
    };
  }
  return {
    eyebrow: "Prompt",
    question: currentWord.germanWord,
    helper: "Reveal the answer when you are ready to rate the card.",
  };
}

// ── Empty-queue action hub ─────────────────────────────────────────────────────

function EmptyQueueHub({
  reviewedCount,
  deckNames,
  nextDueAt,
  onReviewEarly,
  onSwitchDeck,
}: {
  reviewedCount: number;
  deckNames: string[];
  nextDueAt: string | null;
  onReviewEarly: () => void;
  onSwitchDeck: (deck: string) => void;
}) {
  const router = useRouter();
  const [deckPickerOpen, setDeckPickerOpen] = useState(false);

  // WHY: Show push notification prompt after completing a session (reviewedCount > 0)
  // only if the user hasn't been asked before (persisted in localStorage to avoid
  // prompting every session after they declined the browser dialog).
  const push = usePushNotifications();
  const [pushPromptDismissed, setPushPromptDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("lexinote_push_asked") === "true";
  });
  const showPushPrompt =
    push.supported &&
    push.permissionState === "default" &&
    !pushPromptDismissed &&
    reviewedCount > 0;

  async function handleEnablePush() {
    await push.subscribe();
    localStorage.setItem("lexinote_push_asked", "true");
    setPushPromptDismissed(true);
  }

  function handleDismissPush() {
    localStorage.setItem("lexinote_push_asked", "true");
    setPushPromptDismissed(true);
  }

  // Compute hours until next card if all future cards are > 24h away.
  const nextDueHours = useMemo(() => {
    if (!nextDueAt) return null;
    const diffMs = new Date(nextDueAt).getTime() - Date.now();
    if (diffMs <= 0) return null;
    return Math.ceil(diffMs / (1000 * 60 * 60));
  }, [nextDueAt]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col items-center gap-6 p-10 text-center">
        <CheckCircle2 className="h-12 w-12 text-[color:var(--accent-mint)]" />

        <div>
          <h2 className="text-3xl font-semibold text-[color:var(--text)]">Queue complete</h2>
          <p className="mt-2 text-sm text-[color:var(--text-soft)]">
            You reviewed every due card in this session.
          </p>
          {reviewedCount > 0 && (
            <p className="mt-3 text-sm font-medium text-[color:var(--accent)]">
              {/* WHY: Showing session count gives immediate positive reinforcement
                  without requiring an extra API call for streak data. */}
              {reviewedCount} card{reviewedCount !== 1 ? "s" : ""} reviewed this session 🔥
            </p>
          )}
          {nextDueHours != null && nextDueHours > 24 && (
            <p className="mt-2 text-xs text-[color:var(--text-muted)]">
              Next review due in ~{nextDueHours} hour{nextDueHours !== 1 ? "s" : ""} — you are ahead of schedule.
            </p>
          )}
        </div>

        {/* ── Primary CTA ── */}
        <Button
          className="w-full max-w-xs"
          onClick={() => router.push("/words")}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add new words
        </Button>

        {/* ── Secondary CTA — Review Early ── */}
        <Button
          variant="outline"
          className="w-full max-w-xs"
          onClick={onReviewEarly}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Review early (next 24 h)
        </Button>

        {/* ── Push notification prompt ── */}
        {showPushPrompt && (
          <div className="w-full max-w-xs rounded-[20px] border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4 text-left">
            <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text)]">
              <Bell className="h-4 w-4 text-[color:var(--accent)]" />
              Stay on streak
            </div>
            <p className="mt-2 text-xs text-[color:var(--text-soft)] leading-5">
              Get a daily nudge when you have cards due — no account needed.
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" className="flex-1" onClick={handleEnablePush} disabled={push.isSubscribing}>
                {push.isSubscribing ? "Enabling…" : "Enable"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleDismissPush}>
                Later
              </Button>
            </div>
          </div>
        )}

        {/* ── Tertiary CTA — Switch Deck ── */}
        {deckNames.length > 0 && (
          <div className="w-full max-w-xs">
            {!deckPickerOpen ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setDeckPickerOpen(true)}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Switch deck
              </Button>
            ) : (
              // WHY: Inline picker avoids a modal dialog for a 3-option interaction.
              // Opens in place and reuses the same slot so layout does not shift.
              <div className="space-y-2 rounded-[18px] border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-[color:var(--text-muted)]">
                  Pick a deck
                </div>
                {deckNames.map((deck) => (
                  <button
                    key={deck}
                    type="button"
                    className="w-full rounded-[14px] border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3 text-left text-sm font-medium text-[color:var(--text)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)] transition"
                    onClick={() => {
                      setDeckPickerOpen(false);
                      onSwitchDeck(deck);
                    }}
                  >
                    {deck}
                  </button>
                ))}
                <button
                  type="button"
                  className="w-full rounded-[14px] px-4 py-2 text-xs text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition"
                  onClick={() => setDeckPickerOpen(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Keyboard hint row ──────────────────────────────────────────────────────────

function KeyboardHintRow({
  phase,
  visible,
  onToggle,
}: {
  phase: "pre-reveal" | "post-reveal";
  visible: boolean;
  onToggle: () => void;
}) {
  if (!visible) return null;

  return (
    // WHY: `hidden md:flex` hides hints on screens narrower than 768px (mobile).
    // Mobile users don't have a physical keyboard so the hints serve no purpose
    // and only consume space on already-cramped small-screen layouts.
    <div className="hidden md:flex items-center justify-between gap-3 text-[11px] text-[color:var(--text-muted)] opacity-50">
      <div className="flex flex-wrap items-center gap-4">
        {phase === "pre-reveal" ? (
          <span>
            <kbd className="rounded border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-1.5 py-0.5 font-mono text-[10px]">
              Space
            </kbd>{" "}
            Reveal
          </span>
        ) : (
          ratingMeta.map((item) => (
            <span key={item.value}>
              <kbd className="rounded border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-1.5 py-0.5 font-mono text-[10px]">
                {item.key}
              </kbd>{" "}
              {item.label}
            </span>
          ))
        )}
      </div>
      {/* WHY: Toggle button lets users dismiss hints permanently without a
          settings page visit. Preference persists in localStorage. */}
      <button
        type="button"
        className="ml-auto flex items-center gap-1 rounded px-1 hover:opacity-75 transition"
        onClick={onToggle}
        title="Hide keyboard hints"
      >
        <Keyboard className="h-3 w-3" />
        <span>Hide</span>
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function FlashcardStudy({
  words,
  onSessionChange,
  deckNames = [],
  onReviewEarly,
  onSwitchDeck,
  nextDueAt = null,
}: {
  words: StudyWord[];
  onSessionChange?: (payload: { remainingCount: number; reviewedCount: number }) => void;
  // WHY: Deck names are needed to power the "Switch Deck" picker in the empty
  // state without requiring an extra fetch inside this component.
  deckNames?: string[];
  // WHY: Callbacks let the parent (StudyPage) own the data-fetching logic while
  // this component stays a pure presentation layer for study interactions.
  onReviewEarly?: () => void;
  onSwitchDeck?: (deck: string) => void;
  nextDueAt?: string | null;
}) {
  const [queue] = useState(words);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<StudyMode>("flashcard");
  const [showAnswer, setShowAnswer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [answerInput, setAnswerInput] = useState("");
  const [practiceFeedback, setPracticeFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // WHY: showKeyHints persists in localStorage so the user's dismissal survives
  // page reloads and future sessions without needing a backend preference store.
  const [showKeyHints, setShowKeyHints] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("lexinote_key_hints") !== "false";
  });

  // WHY: cardStartTime tracks when the current card was revealed so we can
  // compute time-per-card and pass it to the review API for minutes_studied.
  const cardStartTime = useRef<number>(Date.now());

  const currentWord = queue[currentIndex] ?? null;
  const remainingCount = useMemo(() => queue.length - currentIndex, [queue.length, currentIndex]);
  const promptCopy = currentWord ? getPromptCopy(mode, currentWord) : null;
  const multipleChoiceOptions = useMemo(
    () => (currentWord && mode === "multiple-choice" ? buildMultipleChoiceOptions(queue, currentWord) : []),
    [currentWord, mode, queue]
  );

  // Reset per-card state when moving to a new card or changing mode.
  useEffect(() => {
    setShowAnswer(false);
    setAnswerInput("");
    setPracticeFeedback(null);
    setSelectedOption(null);
    setError(null);
    cardStartTime.current = Date.now(); // WHY: Reset timer when a new card is shown.
  }, [currentIndex, mode]);

  // ── Keyboard shortcut handler ────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // WHY: Skip shortcuts when focus is inside a text input or textarea.
      // Without this, Space would flip cards while the user is typing an answer
      // in typing/fill-in mode — interfering with their text entry.
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        return;
      }

      if (!currentWord) return;

      if (!showAnswer) {
        // Pre-reveal: Space reveals the answer (flashcard mode only; other
        // modes use Enter in their own input handlers).
        if (e.code === "Space" && mode === "flashcard") {
          e.preventDefault(); // WHY: Prevent page scroll on Space.
          setShowAnswer(true);
        }
        return;
      }

      // Post-reveal: 1/2/3/4 submit ratings.
      const keyMap: Record<string, ReviewRating> = {
        "1": "again",
        "2": "hard",
        "3": "good",
        "4": "easy",
      };
      if (keyMap[e.key] && !isSubmitting) {
        e.preventDefault();
        handleRate(keyMap[e.key] as ReviewRating);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // WHY: isSubmitting is in deps so the closure always sees the current value
    // and doesn't re-submit a rating while one is already in-flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWord, showAnswer, mode, isSubmitting]);

  function toggleKeyHints() {
    const next = !showKeyHints;
    setShowKeyHints(next);
    localStorage.setItem("lexinote_key_hints", String(next));
  }

  async function handleRate(rating: ReviewRating) {
    if (!currentWord) return;
    try {
      setError(null);
      setIsSubmitting(true);

      // WHY: Convert elapsed milliseconds to fractional minutes (rounded to
      // 1 decimal). The API clamps this at 10 min, so we don't need to guard
      // for extreme values here — just compute what's accurate.
      const elapsedMinutes = (Date.now() - cardStartTime.current) / 60_000;

      await submitReview(currentWord.id, rating, elapsedMinutes);

      const nextReviewed = reviewedCount + 1;
      const nextIndex = currentIndex + 1;
      setReviewedCount(nextReviewed);
      setCurrentIndex(nextIndex);
      onSessionChange?.({
        remainingCount: Math.max(0, queue.length - nextIndex),
        reviewedCount: nextReviewed,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function revealAnswerWithFeedback(feedback?: { tone: "success" | "error"; message: string }) {
    setPracticeFeedback(feedback ?? null);
    setShowAnswer(true);
  }

  function handleCheckTypingAnswer() {
    if (!currentWord) return;
    if (!answerInput.trim()) {
      setPracticeFeedback({ tone: "error", message: "Type an answer first so we can check it." });
      return;
    }
    if (isCorrectAnswer(currentWord, answerInput)) {
      revealAnswerWithFeedback({ tone: "success", message: "Correct. Nice recall." });
      return;
    }
    revealAnswerWithFeedback({
      tone: "error",
      message: `Not quite. Expected: ${currentWord.germanWord}`,
    });
  }

  function handleSelectOption(option: string) {
    if (!currentWord || showAnswer) return;
    setSelectedOption(option);
    if (normalizeText(option) === normalizeText(currentWord.germanWord)) {
      revealAnswerWithFeedback({ tone: "success", message: "Correct choice." });
      return;
    }
    revealAnswerWithFeedback({
      tone: "error",
      message: `Not this one. Correct answer: ${currentWord.germanWord}`,
    });
  }

  // ── Empty queue state ─────────────────────────────────────────────────────────
  if (!currentWord) {
    return (
      <EmptyQueueHub
        reviewedCount={reviewedCount}
        deckNames={deckNames}
        nextDueAt={nextDueAt}
        onReviewEarly={onReviewEarly ?? (() => {})}
        onSwitchDeck={onSwitchDeck ?? (() => {})}
      />
    );
  }

  // ── Active card ───────────────────────────────────────────────────────────────
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="eyebrow">Study modes</div>
            <CardTitle className="mt-2 text-2xl">Focused review session</CardTitle>
            <CardDescription className="mt-2">
              Move between recall modes without losing the rhythm of your SRS queue.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge>{currentWord.deck}</Badge>
            <Badge>{currentWord.partOfSpeech}</Badge>
            {currentWord.gender ? <Badge>{currentWord.gender}</Badge> : null}
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-4">
          {studyModes.map((studyMode) => {
            const Icon = studyMode.icon;
            const active = mode === studyMode.value;
            return (
              <button
                key={studyMode.value}
                type="button"
                className={cn(
                  "flex items-center justify-between rounded-[18px] border px-4 py-3 text-left transition",
                  active
                    ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--text)] shadow-[var(--shadow-sm)]"
                    : "border-[color:var(--line)] bg-[color:var(--surface-soft)] text-[color:var(--text-soft)] hover:border-[color:var(--line-strong)] hover:bg-[color:var(--surface-strong)]"
                )}
                onClick={() => setMode(studyMode.value)}
              >
                <span className="text-sm font-medium">{studyMode.label}</span>
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {error ? (
          <div className="rounded-[18px] border border-[#e8b5aa] bg-[#fff3ef] px-4 py-3 text-sm text-[#9b4f42]">
            {error}
          </div>
        ) : null}

        <div
          key={`${currentWord.id}-${mode}-${showAnswer ? "answer" : "prompt"}`}
          className="motion-enter rounded-[28px] border border-[color:var(--line)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--bg-elevated)_94%,black),color-mix(in_srgb,var(--bg)_92%,black))] p-5 text-[color:var(--text-inverse)] shadow-[var(--shadow-lg)] md:p-6"
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="eyebrow text-[color:var(--accent-gold)]">{promptCopy?.eyebrow}</div>
            <div className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-muted-inverse)]">
              {studyModes.find((sm) => sm.value === mode)?.label}
            </div>
          </div>

          <div className="mt-4 max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">
            {mode === "flashcard" ? currentWord.germanWord : promptCopy?.question}
          </div>

          <div className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--text-muted-inverse)]">
            {promptCopy?.helper}
          </div>

          {currentWord.tags.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {currentWord.tags.map((tag) => (
                <Badge key={tag} className="bg-[rgba(255,255,255,0.08)] text-[color:var(--text-inverse)]">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}

          {/* ── Pre-reveal: flashcard ── */}
          {!showAnswer && mode === "flashcard" ? (
            <div className="mt-7 space-y-4">
              <div className="flex">
                <Button className="px-6" onClick={() => setShowAnswer(true)}>
                  Reveal answer
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <KeyboardHintRow
                phase="pre-reveal"
                visible={showKeyHints}
                onToggle={toggleKeyHints}
              />
            </div>
          ) : null}

          {/* ── Pre-reveal: typing / fill-in ── */}
          {!showAnswer && (mode === "typing" || mode === "fill-in") ? (
            <div className="mt-7 space-y-4">
              <div className="max-w-xl">
                <Input
                  value={answerInput}
                  placeholder={mode === "fill-in" ? "Type the missing word" : "Type the German answer"}
                  onChange={(event) => setAnswerInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleCheckTypingAnswer();
                    }
                  }}
                />
              </div>
              {practiceFeedback && !showAnswer ? (
                <div className="rounded-[18px] border border-[#e8b5aa] bg-[#fff3ef] px-4 py-3 text-sm text-[#9b4f42]">
                  {practiceFeedback.message}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleCheckTypingAnswer}>Check answer</Button>
                <Button variant="outline" onClick={() => setShowAnswer(true)}>
                  Reveal answer
                </Button>
              </div>
            </div>
          ) : null}

          {/* ── Pre-reveal: multiple choice ── */}
          {!showAnswer && mode === "multiple-choice" ? (
            <div className="mt-7 grid gap-3 md:grid-cols-2">
              {multipleChoiceOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={cn(
                    "motion-rise-sm rounded-[18px] border px-4 py-4 text-left text-base font-medium transition",
                    selectedOption === option
                      ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--text)]"
                      : "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)]"
                  )}
                  onClick={() => handleSelectOption(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : null}

          {/* ── Post-reveal: answer panel + rating buttons ── */}
          {showAnswer ? (
            <div className="mt-7 space-y-4 rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] p-4">
              {practiceFeedback ? (
                <div
                  className={cn(
                    "rounded-[16px] px-4 py-3 text-sm",
                    practiceFeedback.tone === "success"
                      ? "border border-[#9ed1ba] bg-[rgba(156,201,184,0.14)] text-[#dff4ea]"
                      : "border border-[#e8b5aa] bg-[rgba(184,92,84,0.14)] text-[#ffd9d2]"
                  )}
                >
                  {practiceFeedback.message}
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4">
                  <div>
                    <div className="eyebrow text-[color:var(--accent-gold)]">German word</div>
                    <div className="mt-2 text-2xl font-semibold text-[color:var(--text-inverse)]">
                      {currentWord.germanWord}
                    </div>
                  </div>
                  <div>
                    <div className="eyebrow text-[color:var(--accent-gold)]">Translation</div>
                    <div className="mt-2 text-xl font-semibold text-[color:var(--text-inverse)]">
                      {currentWord.translation || "Translation pending"}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {currentWord.exampleSentence ? (
                    <div className="rounded-[18px] border border-[rgba(144,184,168,0.2)] bg-[rgba(144,184,168,0.08)] p-4">
                      <div className="eyebrow text-[color:var(--accent-mint)]">Example sentence</div>
                      <div className="mt-2 text-sm leading-7 text-[color:var(--text-inverse)]">
                        {currentWord.exampleSentence}
                      </div>
                      {currentWord.exampleTranslation ? (
                        <div className="mt-2 text-sm text-[color:var(--text-muted-inverse)]">
                          {currentWord.exampleTranslation}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {currentWord.notes ? (
                    <div className="rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-4">
                      <div className="eyebrow text-[color:var(--accent-gold)]">Notes</div>
                      <div className="mt-2 text-sm leading-6 text-[color:var(--text-muted-inverse)]">
                        {currentWord.notes}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-4">
                  {ratingMeta.map((item) => (
                    <Button
                      key={item.value}
                      variant={item.value === "again" ? "destructive" : "outline"}
                      className={cn(
                        "h-auto rounded-[18px] px-4 py-4",
                        item.value !== "again" &&
                          "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.95)] text-[color:var(--text)]"
                      )}
                      disabled={isSubmitting}
                      onClick={() => handleRate(item.value)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-semibold">{item.label}</span>
                        <span className="text-xs opacity-80">{item.hint}</span>
                      </div>
                    </Button>
                  ))}
                </div>

                {/* WHY: Hint row sits below the buttons so it doesn't compete
                    visually with the rating choices during the moment of recall.
                    Subtle opacity (handled by KeyboardHintRow) keeps it
                    discoverable without distracting. */}
                <KeyboardHintRow
                  phase="post-reveal"
                  visible={showKeyHints}
                  onToggle={toggleKeyHints}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[color:var(--text-soft)]">
          <div>Card {Math.min(currentIndex + 1, queue.length)} of {queue.length}</div>
          <div>Remaining {Math.max(0, remainingCount)} • Reviewed {reviewedCount}</div>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RotateCcw,
  Sparkles,
  CheckCircle2,
  PencilLine,
  SquareDashedBottom,
  Layers3,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { submitReview, type ReviewRating, type StudyWord } from "@/lib/study-fetch";
import { cn } from "@/lib/utils";

const ratingMeta: { value: ReviewRating; label: string; hint: string }[] = [
  { value: "again", label: "Again", hint: "Reset sooner" },
  { value: "hard", label: "Hard", hint: "Small step" },
  { value: "good", label: "Good", hint: "Normal step" },
  { value: "easy", label: "Easy", hint: "Bigger jump" },
];

const studyModes = [
  { value: "flashcard", label: "Flashcards", icon: Layers3 },
  { value: "typing", label: "Typing", icon: PencilLine },
  { value: "multiple-choice", label: "Choice", icon: Sparkles },
  { value: "fill-in", label: "Fill in", icon: SquareDashedBottom },
] as const;

type StudyMode = (typeof studyModes)[number]["value"];

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
  if (articleFree && articleFree !== word.germanWord) {
    answers.push(articleFree);
  }
  return [...new Set(answers.map(normalizeText).filter(Boolean))];
}

function isCorrectAnswer(word: StudyWord, answer: string) {
  const normalized = normalizeText(answer);
  return getAcceptedAnswers(word).includes(normalized);
}

function getMaskedSentence(sentence: string, germanWord: string) {
  if (!sentence) return "";
  const exactPattern = new RegExp(`\\b${escapeRegExp(germanWord)}\\b`, "i");
  if (exactPattern.test(sentence)) {
    return sentence.replace(exactPattern, "________");
  }

  const articleFree = stripArticle(germanWord);
  if (!articleFree) return sentence;

  const basePattern = new RegExp(`\\b${escapeRegExp(articleFree)}\\b`, "i");
  if (basePattern.test(sentence)) {
    return sentence.replace(basePattern, "________");
  }

  return sentence;
}

function buildMultipleChoiceOptions(queue: StudyWord[], currentWord: StudyWord) {
  const distractors = queue
    .filter((word) => word.id !== currentWord.id && word.germanWord !== currentWord.germanWord)
    .slice(0, 6)
    .map((word) => word.germanWord);

  const options = [currentWord.germanWord];
  for (const distractor of distractors) {
    if (!options.includes(distractor) && options.length < 4) {
      options.push(distractor);
    }
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

  return {
    eyebrow: "Prompt",
    question: currentWord.germanWord,
    helper: "Reveal the answer when you are ready to rate the card.",
  };
}

export function FlashcardStudy({
  words,
  onSessionChange,
}: {
  words: StudyWord[];
  onSessionChange?: (payload: { remainingCount: number; reviewedCount: number }) => void;
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

  const currentWord = queue[currentIndex] ?? null;
  const remainingCount = useMemo(() => queue.length - currentIndex, [queue.length, currentIndex]);
  const promptCopy = currentWord ? getPromptCopy(mode, currentWord) : null;
  const multipleChoiceOptions = useMemo(
    () => (currentWord && mode === "multiple-choice" ? buildMultipleChoiceOptions(queue, currentWord) : []),
    [currentWord, mode, queue]
  );

  useEffect(() => {
    setShowAnswer(false);
    setAnswerInput("");
    setPracticeFeedback(null);
    setSelectedOption(null);
    setError(null);
  }, [currentIndex, mode]);

  async function handleRate(rating: ReviewRating) {
    if (!currentWord) return;
    try {
      setError(null);
      setIsSubmitting(true);
      await submitReview(currentWord.id, rating);
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

  if (!currentWord) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center gap-4 p-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-[color:var(--accent-mint)]" />
          <div>
            <h2 className="text-3xl font-semibold text-[color:var(--text)]">Session complete</h2>
            <p className="mt-2 text-sm text-[color:var(--text-soft)]">You reviewed every due card in this session.</p>
          </div>
          <Button variant="outline" onClick={() => location.reload()}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restart session
          </Button>
        </CardContent>
      </Card>
    );
  }

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
              {studyModes.find((studyMode) => studyMode.value === mode)?.label}
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

          {!showAnswer && mode === "flashcard" ? (
            <div className="mt-7 flex">
              <Button className="px-6" onClick={() => setShowAnswer(true)}>
                Reveal answer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : null}

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
                    <div className="mt-2 text-2xl font-semibold text-[color:var(--text-inverse)]">{currentWord.germanWord}</div>
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
                      <div className="mt-2 text-sm leading-7 text-[color:var(--text-inverse)]">{currentWord.exampleSentence}</div>
                      {currentWord.exampleTranslation ? (
                        <div className="mt-2 text-sm text-[color:var(--text-muted-inverse)]">{currentWord.exampleTranslation}</div>
                      ) : null}
                    </div>
                  ) : null}

                  {currentWord.notes ? (
                    <div className="rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-4">
                      <div className="eyebrow text-[color:var(--accent-gold)]">Notes</div>
                      <div className="mt-2 text-sm leading-6 text-[color:var(--text-muted-inverse)]">{currentWord.notes}</div>
                    </div>
                  ) : null}
                </div>
              </div>

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
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[color:var(--text-soft)]">
          <div>
            Card {Math.min(currentIndex + 1, queue.length)} of {queue.length}
          </div>
          <div>
            Remaining {Math.max(0, remainingCount)} • Reviewed {reviewedCount}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

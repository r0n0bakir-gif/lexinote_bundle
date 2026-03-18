"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenText, Layers3, Tags as TagsIcon, Wand2 } from "lucide-react";
import { AppTopbar } from "@/components/lexinote/app-topbar";
import { DeckManager } from "@/components/lexinote/deck-manager";
import { ManualWordEntry } from "@/components/lexinote/manual-word-entry";
import { WordNotebookList } from "@/components/lexinote/word-notebook-list";
import { NotebookFilters, type NotebookFilterState } from "@/components/lexinote/notebook-filters";
import { fetchWords, type NotebookWord } from "@/lib/word-fetch";
import { fetchDecks, type DeckSummary } from "@/lib/deck-fetch";

const initialFilters: NotebookFilterState = {
  query: "",
  deck: "all",
  source: "all",
  partOfSpeech: "all",
  tag: "all",
};

export default function WordsPage() {
  const router = useRouter();
  const [words, setWords] = useState<NotebookWord[]>([]);
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [filters, setFilters] = useState<NotebookFilterState>(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(
    () => ({
      wordCount: words.length,
      deckCount: decks.length,
      tagCount: tags.length,
    }),
    [words.length, decks.length, tags.length]
  );

  const loadWords = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      const [data, deckData] = await Promise.all([fetchWords(filters), fetchDecks()]);
      setWords(data.words);
      setDecks(deckData);
      setTags(data.meta.tags);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load words.";
      if (message === "Unauthorized") {
        router.replace("/auth");
        return;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters, router]);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  return (
    <div className="app-shell">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
        <AppTopbar />

        <div className="mb-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div
            className="motion-enter rounded-[30px] border border-[color:var(--line)] bg-[color:var(--bg-elevated)] p-6 text-[color:var(--text-inverse)] shadow-[var(--shadow-lg)] backdrop-blur-xl md:p-7"
            style={{ animationDelay: "120ms" }}
          >
            <div className="eyebrow text-[color:var(--accent-gold)]">LexiNote notebook</div>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight md:text-6xl">
              Build a vocabulary workspace that actually feels worth returning to.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--text-muted-inverse)] md:text-lg">
              Capture fast, organize clearly, and keep your library easy to trust.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] px-4 py-2 text-sm">
                <BookOpenText className="h-4 w-4 text-[color:var(--accent-gold)]" />
                {stats.wordCount} visible words
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] px-4 py-2 text-sm">
                <Layers3 className="h-4 w-4 text-[color:var(--accent-gold)]" />
                {stats.deckCount} active decks
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] px-4 py-2 text-sm">
                <TagsIcon className="h-4 w-4 text-[color:var(--accent-gold)]" />
                {stats.tagCount} tags in play
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div
              className="motion-enter rounded-[26px] border border-[color:var(--line)] bg-[color:var(--surface)] p-5 text-[color:var(--text)] shadow-[var(--shadow-md)]"
              style={{ animationDelay: "180ms" }}
            >
              <div className="eyebrow">Workspace rhythm</div>
              <div className="mt-3 text-xl font-semibold">
                {stats.wordCount ? "Organize first, capture second." : "Start by saving your first high-value word."}
              </div>
              <div className="mt-2 text-sm leading-6 text-[color:var(--text-soft)]">
                Good structure keeps review simple later.
              </div>
            </div>
            <div
              className="motion-enter rounded-[26px] border border-[color:var(--line)] bg-[color:var(--surface)] p-5 text-[color:var(--text)] shadow-[var(--shadow-md)]"
              style={{ animationDelay: "240ms" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="eyebrow">Best practice</div>
                  <div className="mt-2 text-xl font-semibold">Keep cards lean and memorable</div>
                </div>
                <Wand2 className="h-5 w-5 text-[color:var(--accent)]" />
              </div>
              <div className="mt-3 text-sm leading-6 text-[color:var(--text-soft)]">
                Short, clear cards are easier to remember.
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-[24px] border border-[#d99e95] bg-[#fff1ed] px-5 py-4 text-sm text-[#9b4f42]">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="motion-enter" style={{ animationDelay: "300ms" }}>
              <DeckManager decks={decks} onDecksChanged={loadWords} />
            </div>
            <div className="motion-enter" style={{ animationDelay: "360ms" }}>
              <ManualWordEntry decks={decks} onWordCreated={() => loadWords()} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="motion-enter" style={{ animationDelay: "420ms" }}>
              <NotebookFilters
                filters={filters}
                onFiltersChange={setFilters}
                decks={decks.map((deck) => deck.name)}
                tags={tags}
              />
            </div>

            {isLoading ? (
              <div
                className="motion-enter rounded-[26px] border border-[color:var(--line)] bg-[color:var(--surface)] p-10 text-sm text-[color:var(--text-soft)] shadow-[var(--shadow-md)]"
                style={{ animationDelay: "480ms" }}
              >
                Loading notebook...
              </div>
            ) : (
              <div className="motion-enter-soft" style={{ animationDelay: "480ms" }}>
                <WordNotebookList words={words} decks={decks} onRefresh={loadWords} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenText, Layers3, Tags as TagsIcon, Wand2 } from "lucide-react";
import { AppTopbar } from "@/components/lexinote/app-topbar";
import { DeckManager } from "@/components/lexinote/deck-manager";
import { ManualWordEntry } from "@/components/lexinote/manual-word-entry";
import { WordNotebookList } from "@/components/lexinote/word-notebook-list";
import { NotebookFilters, type NotebookFilterState } from "@/components/lexinote/notebook-filters";
import { WindowPanel } from "@/components/lexinote/window-panel";
import { fetchWords, type NotebookWord } from "@/lib/word-fetch";
import { fetchDecks, type DeckSummary } from "@/lib/deck-fetch";
import { useDebounce } from "@/hooks/useDebounce";
import { useTheme } from "@/components/lexinote/theme-provider";

const initialFilters: NotebookFilterState = {
  query: "",
  deck: "all",
  source: "all",
  partOfSpeech: "all",
  tag: "all",
};

export default function WordsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [words, setWords] = useState<NotebookWord[]>([]);
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [filters, setFilters] = useState<NotebookFilterState>(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  // WHY: isSearching is separate from isLoading — it is true only while a
  // debounced query fetch is in-flight (after the 300ms debounce settles).
  // This drives the spinner inside the search input without blocking the rest
  // of the page layout the way the full isLoading skeleton does.
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // WHY: Only the query field is debounced. Dropdown filters (deck, source,
  // partOfSpeech, tag) are single clicks — they should feel instant. Debouncing
  // them would introduce unnecessary latency with no UX benefit.
  const debouncedQuery = useDebounce(filters.query, 300);

  // Merge the debounced query back into the effective filter set that actually
  // drives the API call. This means selects fire immediately while keystrokes
  // wait for the debounce window to close.
  const effectiveFilters = useMemo(
    () => ({ ...filters, query: debouncedQuery }),
    // WHY: Include all filters so a select change still triggers a refetch even
    // if the debounced query hasn't changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debouncedQuery, filters.deck, filters.source, filters.partOfSpeech, filters.tag]
  );

  // WHY: AbortController reference lets us cancel the previous in-flight fetch
  // when a new search starts before the previous one resolves. Without this,
  // responses can arrive out of order — a slow response for "Haus" could
  // overwrite a fast response for "Hausfrau", showing stale results.
  const abortRef = useRef<AbortController | null>(null);

  const loadWords = useCallback(
    async (opts: { showFullLoader?: boolean } = {}) => {
      // Cancel any in-flight request.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        setError(null);
        if (opts.showFullLoader) {
          setIsLoading(true);
        } else {
          // WHY: For query-driven re-fetches (debounced keystrokes), we show the
          // small spinner in the search input rather than the full loading skeleton.
          // This preserves the word list visibility while the search runs.
          setIsSearching(true);
        }

        const [data, deckData] = await Promise.all([
          fetchWords(effectiveFilters, controller.signal),
          fetchDecks(),
        ]);

        setWords(data.words);
        setDecks(deckData);
        setTags(data.meta.tags);
      } catch (err) {
        // WHY: AbortError is intentional (a newer request superseded this one).
        // Do not surface it as a user-facing error.
        if (err instanceof Error && err.name === "AbortError") return;

        const message = err instanceof Error ? err.message : "Failed to load words.";
        if (message === "Unauthorized") {
          router.replace("/auth");
          return;
        }
        setError(message);
      } finally {
        setIsLoading(false);
        setIsSearching(false);
      }
    },
    // WHY: effectiveFilters (not filters) is the dependency so loadWords only
    // re-runs after the debounce window closes for query changes.
    [effectiveFilters, router]
  );

  // Initial load uses the full skeleton loader.
  useEffect(() => {
    loadWords({ showFullLoader: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subsequent filter changes use the search spinner only.
  useEffect(() => {
    loadWords({ showFullLoader: false });
  }, [loadWords]);

  const stats = useMemo(
    () => ({
      wordCount: words.length,
      deckCount: decks.length,
      tagCount: tags.length,
    }),
    [words.length, decks.length, tags.length]
  );

  if (theme === "retro") {
    return (
      <div className="retro-canvas-grid">
        {/* Left column */}
        <div className="retro-canvas-col">
          <WindowPanel title="notebook_stats.png">
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="retro-stat-row">
                <BookOpenText size={12} /> {stats.wordCount} words visible
              </div>
              <div className="retro-stat-row">
                <Layers3 size={12} /> {stats.deckCount} active decks
              </div>
              <div className="retro-stat-row">
                <TagsIcon size={12} /> {stats.tagCount} tags in use
              </div>
            </div>
          </WindowPanel>

          <WindowPanel title="decks.psd">
            <DeckManager decks={decks} onDecksChanged={() => loadWords({ showFullLoader: false })} />
          </WindowPanel>

          <WindowPanel title="add_word.jpg">
            <ManualWordEntry decks={decks} onWordCreated={() => loadWords({ showFullLoader: false })} />
          </WindowPanel>
        </div>

        {/* Right column */}
        <div className="retro-canvas-col">
          {error ? (
            <WindowPanel title="error.png">
              <div style={{ color: "#9b4f42", fontSize: 11 }}>{error}</div>
            </WindowPanel>
          ) : null}

          <WindowPanel title="filters.png">
            <NotebookFilters
              filters={filters}
              onFiltersChange={setFilters}
              decks={decks.map((d) => d.name)}
              tags={tags}
              isSearching={isSearching}
            />
          </WindowPanel>

          <WindowPanel title="words_notebook.psd">
            {isLoading ? (
              <div style={{ padding: "20px 0", color: "#666", fontSize: 11 }}>Loading notebook...</div>
            ) : (
              <WordNotebookList
                words={words}
                decks={decks}
                onRefresh={() => loadWords({ showFullLoader: false })}
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
              <DeckManager decks={decks} onDecksChanged={() => loadWords({ showFullLoader: false })} />
            </div>
            <div className="motion-enter" style={{ animationDelay: "360ms" }}>
              <ManualWordEntry decks={decks} onWordCreated={() => loadWords({ showFullLoader: false })} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="motion-enter" style={{ animationDelay: "420ms" }}>
              <NotebookFilters
                filters={filters}
                onFiltersChange={setFilters}
                decks={decks.map((deck) => deck.name)}
                tags={tags}
                isSearching={isSearching}
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
                <WordNotebookList
                  words={words}
                  decks={decks}
                  onRefresh={() => loadWords({ showFullLoader: false })}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

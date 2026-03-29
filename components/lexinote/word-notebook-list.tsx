"use client";

import { useState } from "react";
import { BookMarked, HelpCircle, Sparkles, Tag, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteWord, type NotebookWord } from "@/lib/word-fetch";
import type { DeckSummary } from "@/lib/deck-fetch";
import { EditWordDialog } from "@/components/lexinote/edit-word-dialog";
import { EnrichWordButton } from "@/components/lexinote/enrich-word-button";

// WHY: CEFR color bands match the notebook-filters chips so they read as a
// coherent visual system: green=beginner, amber=intermediate, violet=advanced.
function CefrBadge({ level }: { level: string | null | undefined }) {
  if (!level) {
    return (
      <span
        title="CEFR level not yet determined — click AI Enrich to populate"
        className="inline-flex items-center gap-1 rounded-full border border-[color:var(--line)] px-2.5 py-0.5 text-[11px] font-medium text-[color:var(--text-muted)]"
      >
        <HelpCircle className="h-3 w-3" />
        ?
      </span>
    );
  }

  const colorMap: Record<string, string> = {
    A1: "bg-[rgba(144,200,144,0.18)] text-[#4a8a4a] border-[rgba(144,200,144,0.4)]",
    A2: "bg-[rgba(144,200,144,0.18)] text-[#4a8a4a] border-[rgba(144,200,144,0.4)]",
    B1: "bg-[rgba(210,160,60,0.18)] text-[#8a6010] border-[rgba(210,160,60,0.4)]",
    B2: "bg-[rgba(210,160,60,0.18)] text-[#8a6010] border-[rgba(210,160,60,0.4)]",
    C1: "bg-[rgba(140,100,210,0.18)] text-[#6040a0] border-[rgba(140,100,210,0.4)]",
    C2: "bg-[rgba(140,100,210,0.18)] text-[#6040a0] border-[rgba(140,100,210,0.4)]",
  };
  const className = colorMap[level] ?? "bg-[rgba(0,0,0,0.05)] text-[color:var(--text-soft)] border-[color:var(--line)]";

  return (
    <span
      title={`CEFR level: ${level}`}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${className}`}
    >
      {level}
    </span>
  );
}

export function WordNotebookList({
  words,
  decks,
  onRefresh,
}: {
  words: NotebookWord[];
  decks: DeckSummary[];
  onRefresh: () => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    try {
      setError(null);
      setDeletingId(id);
      await deleteWord(id);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete word.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="eyebrow">Notebook library</div>
            <CardTitle className="mt-2 flex items-center gap-3 text-2xl">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                <BookMarked className="h-4.5 w-4.5" />
              </span>
              Your saved vocabulary
            </CardTitle>
            <CardDescription className="mt-2">
              Edit and refine the cards in your study system.
            </CardDescription>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 py-2 text-sm font-medium text-[color:var(--text-soft)]">
            <Sparkles className="h-4 w-4 text-[color:var(--accent)]" />
            {words.length} saved word{words.length === 1 ? "" : "s"}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="mb-4 rounded-[18px] border border-[#e8b5aa] bg-[#fff3ef] px-4 py-3 text-sm text-[#9b4f42]">
            {error}
          </div>
        ) : null}

        <div className="space-y-3">
          {words.length ? (
            words.map((word, index) => (
              <div
                key={word.id}
                className="motion-enter motion-rise-sm rounded-[22px] border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4 shadow-[var(--shadow-sm)]"
                style={{ animationDelay: `${Math.min(index, 6) * 55}ms` }}
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-xl font-semibold text-[color:var(--text)]">{word.germanWord}</div>
                      <Badge>{word.deck}</Badge>
                      <Badge>{word.partOfSpeech}</Badge>
                      {word.gender ? <Badge>{word.gender}</Badge> : null}
                      <CefrBadge level={word.cefrLevel} />
                    </div>

                    <div className="mt-2 text-base text-[color:var(--text-soft)]">{word.translation}</div>

                    {word.notes ? (
                      <div className="mt-3 rounded-[16px] bg-[rgba(0,0,0,0.02)] px-3 py-2 text-sm leading-6 text-[color:var(--text-soft)]">
                        {word.notes}
                      </div>
                    ) : null}

                    {word.exampleSentence ? (
                      <div className="mt-3 rounded-[18px] border border-[color:var(--line)] bg-[rgba(0,0,0,0.04)] p-3">
                        <div className="eyebrow">Example</div>
                        <div className="mt-2 text-sm leading-6 text-[color:var(--text)]">{word.exampleSentence}</div>
                        {word.exampleTranslation ? (
                          <div className="mt-1 text-sm text-[color:var(--text-soft)]">{word.exampleTranslation}</div>
                        ) : null}
                      </div>
                    ) : null}

                    {(word.synonyms?.length || word.antonyms?.length || word.tags.length > 0) ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {word.tags.map((tag) => (
                          <Badge key={tag} className="bg-[rgba(144,184,168,0.16)] text-[color:var(--accent-mint)]">
                            <Tag className="h-3 w-3" />
                            {tag}
                          </Badge>
                        ))}
                        {word.synonyms?.length ? (
                          <Badge className="bg-[rgba(215,123,86,0.12)] text-[color:var(--accent)]">
                            Syn: {word.synonyms.slice(0, 2).join(", ")}
                          </Badge>
                        ) : null}
                        {word.antonyms?.length ? (
                          <Badge className="bg-[rgba(0,0,0,0.05)] text-[color:var(--text-soft)]">
                            Ant: {word.antonyms.slice(0, 2).join(", ")}
                          </Badge>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2 xl:w-[240px] xl:justify-end">
                    <EditWordDialog word={word} decks={decks} onSaved={onRefresh} />
                    <EnrichWordButton wordId={word.id} onDone={onRefresh} />
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => handleDelete(word.id)}
                      disabled={deletingId === word.id}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {deletingId === word.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[22px] border border-dashed border-[color:var(--line)] bg-[color:var(--surface-soft)] p-10 text-center">
              <div className="text-lg font-semibold text-[color:var(--text)]">No matching words</div>
              <div className="mt-2 text-sm text-[color:var(--text-soft)]">
                Clear a filter or save a new word.
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

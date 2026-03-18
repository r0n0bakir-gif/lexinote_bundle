"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Sparkles, Wand2, Layers3, Languages, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createManualWord, type NotebookWord } from "@/lib/word-fetch";
import type { DeckSummary } from "@/lib/deck-fetch";
import { inferGender, inferPartOfSpeech } from "@/lib/word-normalize";

const partOfSpeechOptions = ["noun", "verb", "adjective", "adverb", "phrase", "other"];

export function ManualWordEntry({
  decks,
  onWordCreated,
}: {
  decks: DeckSummary[];
  onWordCreated: (word: NotebookWord) => void;
}) {
  const [tagsInput, setTagsInput] = useState("");
  const [autoDetect, setAutoDetect] = useState(true);
  const [queueAiEnrichment, setQueueAiEnrichment] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const availableDecks = useMemo(
    () =>
      decks.length
        ? decks
        : [{ id: "quick-capture-fallback", name: "Quick Capture", isDefault: true, wordCount: 0, dueCount: 0 }],
    [decks]
  );
  const defaultDeckName = useMemo(
    () => availableDecks.find((deck) => deck.isDefault)?.name ?? availableDecks[0]?.name ?? "Quick Capture",
    [availableDecks]
  );
  const [form, setForm] = useState({
    germanWord: "",
    translation: "",
    deck: "Quick Capture",
    partOfSpeech: "other",
    notes: "",
  });

  useEffect(() => {
    setForm((prev) => {
      if (availableDecks.some((deck) => deck.name === prev.deck)) {
        return prev;
      }

      return { ...prev, deck: defaultDeckName };
    });
  }, [availableDecks, defaultDeckName]);

  function handleGermanWordChange(value: string) {
    setForm((prev) => ({
      ...prev,
      germanWord: value,
      partOfSpeech: autoDetect ? inferPartOfSpeech(value) : prev.partOfSpeech,
    }));
  }

  async function handleSubmit() {
    setError(null);
    setSuccess(null);

    if (!form.germanWord.trim()) {
      setError("German word is required.");
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    try {
      setIsSaving(true);
      const created = await createManualWord({ ...form, tags, queueAiEnrichment });
      onWordCreated({
        id: created.id,
        germanWord: created.german_word,
        translation: created.translation ?? "-",
        source: created.source ?? "manual",
        partOfSpeech: created.part_of_speech ?? form.partOfSpeech,
        deck: form.deck,
        tags: created.tags?.map((tag: { name: string }) => tag.name) ?? tags,
        createdAt: created.created_at ?? new Date().toISOString(),
        gender: created.gender ?? inferGender(form.germanWord) ?? "",
        notes: created.notes ?? "",
        exampleSentence: created.example_sentence ?? "",
        exampleTranslation: created.example_translation ?? "",
        synonyms: created.synonyms ?? [],
        antonyms: created.antonyms ?? [],
      });
      setSuccess(`Saved: ${form.germanWord.trim()}`);
      setForm({
        germanWord: "",
        translation: "",
        deck: form.deck || defaultDeckName,
        partOfSpeech: "other",
        notes: "",
      });
      setTagsInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save word.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleClear() {
    setError(null);
    setSuccess(null);
    setForm({
      germanWord: "",
      translation: "",
      deck: defaultDeckName,
      partOfSpeech: "other",
      notes: "",
    });
    setTagsInput("");
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="relative pb-4">
        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(156,201,184,0.22),transparent_48%),radial-gradient(circle_at_top_right,rgba(234,143,106,0.16),transparent_48%)]" />
        <div className="relative space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(97,77,63,0.12)] bg-[rgba(255,255,255,0.7)] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#8a6a56]">
            <Sparkles className="h-3.5 w-3.5" />
            Quick capture
          </div>

          <div>
            <CardTitle className="flex items-center gap-3 text-3xl">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2f2621] text-[#fff7ef] shadow-[0_10px_24px_rgba(30,20,15,0.18)]">
                <Plus className="h-5 w-5" />
              </span>
              Add a new word
            </CardTitle>
            <CardDescription className="mt-2 max-w-2xl text-base">
              Save fast and keep moving.
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-[#7f6f64]">
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(255,255,255,0.55)] px-3 py-2">
              <Layers3 className="h-3.5 w-3.5 text-[#d16c44]" />
              Choose a deck
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(255,255,255,0.55)] px-3 py-2">
              <Languages className="h-3.5 w-3.5 text-[#d16c44]" />
              Add meaning
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(255,255,255,0.55)] px-3 py-2">
              <Tags className="h-3.5 w-3.5 text-[#d16c44]" />
              Tag if needed
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2.5">
            <Label>German word</Label>
            <Input
              placeholder="e.g. der Fortschritt"
              value={form.germanWord}
              onChange={(e) => handleGermanWordChange(e.target.value)}
            />
          </div>
          <div className="space-y-2.5">
            <Label>Translation</Label>
            <Input
              placeholder="e.g. progress"
              value={form.translation}
              onChange={(e) => setForm((prev) => ({ ...prev, translation: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2.5">
            <Label>Deck</Label>
            <Select value={form.deck} onValueChange={(value) => setForm((prev) => ({ ...prev, deck: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select deck" />
              </SelectTrigger>
              <SelectContent>
                {availableDecks.map((deck) => (
                  <SelectItem key={deck.id} value={deck.name}>
                    {deck.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2.5">
            <Label>Part of speech</Label>
            <Select
              value={form.partOfSpeech}
              onValueChange={(value) => setForm((prev) => ({ ...prev, partOfSpeech: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {partOfSpeechOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-2.5">
            <Label>Tags</Label>
            <Input
              placeholder="travel, b2, daily-life"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>

          <div className="space-y-2.5">
            <Label>Notes</Label>
            <Textarea
              className="min-h-[88px]"
              placeholder="Optional note..."
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid gap-3 rounded-[24px] border border-[rgba(97,77,63,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.75),rgba(255,247,238,0.95))] p-3 shadow-[0_14px_28px_rgba(36,25,20,0.08)] md:grid-cols-2">
          <div className="flex items-center justify-between gap-4 rounded-[20px] bg-[rgba(255,255,255,0.55)] px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#322721]">
                <Wand2 className="h-4 w-4 shrink-0 text-[#d16c44]" />
                Auto-detect
              </div>
              <p className="mt-1 text-xs leading-5 text-[#786b61]">Guess grammar as you type.</p>
            </div>
            <Switch checked={autoDetect} onCheckedChange={setAutoDetect} />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-[20px] bg-[rgba(255,255,255,0.55)] px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#322721]">
                <Sparkles className="h-4 w-4 shrink-0 text-[#d16c44]" />
                AI enrichment
              </div>
              <p className="mt-1 text-xs leading-5 text-[#786b61]">Add examples and related words later.</p>
            </div>
            <Switch checked={queueAiEnrichment} onCheckedChange={setQueueAiEnrichment} />
          </div>
        </div>

        {error ? (
          <div className="rounded-[22px] border border-[#e8b5aa] bg-[#fff3ef] px-4 py-3 text-sm text-[#9b4f42]">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-[22px] border border-[#b9d9cb] bg-[#eef9f4] px-4 py-3 text-sm text-[#3c6f5f]">
            {success}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button className="px-6" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save word"}
          </Button>
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Layers3, PencilLine, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createDeck, deleteDeck, updateDeck, type DeckSummary } from "@/lib/deck-fetch";

export function DeckManager({
  decks,
  onDecksChanged,
}: {
  decks: DeckSummary[];
  onDecksChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totals = useMemo(
    () => ({
      deckCount: decks.length,
      totalWords: decks.reduce((sum, deck) => sum + deck.wordCount, 0),
      dueWords: decks.reduce((sum, deck) => sum + deck.dueCount, 0),
    }),
    [decks]
  );

  async function handleCreate() {
    try {
      setError(null);
      setIsCreating(true);
      await createDeck({ name, description });
      setName("");
      setDescription("");
      onDecksChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create deck.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      setError(null);
      setDeletingId(id);
      await deleteDeck(id);
      onDecksChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete deck.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow">Deck studio</div>
            <CardTitle className="mt-2 flex items-center gap-3 text-2xl">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                <Layers3 className="h-4.5 w-4.5" />
              </span>
              Organize your decks
            </CardTitle>
            <CardDescription className="mt-2">
              Group words by topic, level, or goal.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-3 py-3">
            <div className="eyebrow">Decks</div>
            <div className="mt-2 text-2xl font-semibold text-[color:var(--text)]">{totals.deckCount}</div>
          </div>
          <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-3 py-3">
            <div className="eyebrow">Words</div>
            <div className="mt-2 text-2xl font-semibold text-[color:var(--text)]">{totals.totalWords}</div>
          </div>
          <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-3 py-3">
            <div className="eyebrow">Due</div>
            <div className="mt-2 text-2xl font-semibold text-[color:var(--text)]">{totals.dueWords}</div>
          </div>
        </div>

        <div className="rounded-[22px] border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4">
          <div className="grid gap-3">
            <Input placeholder="New deck name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Optional description" value={description} onChange={(e) => setDescription(e.target.value)} />
            <Button onClick={handleCreate} disabled={isCreating}>
              <Plus className="mr-2 h-4 w-4" />
              {isCreating ? "Creating..." : "Create deck"}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded-[18px] border border-[#e8b5aa] bg-[#fff3ef] px-4 py-3 text-sm text-[#9b4f42]">
            {error}
          </div>
        ) : null}

        <div className="space-y-2">
          {decks.length ? (
            decks.map((deck) => (
              <div
                key={deck.id}
                className="rounded-[20px] border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4 shadow-[var(--shadow-sm)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-base font-semibold text-[color:var(--text)]">{deck.name}</div>
                      {deck.isDefault ? (
                        <Badge className="bg-[rgba(144,184,168,0.16)] text-[color:var(--accent-mint)]">Default</Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 text-sm text-[color:var(--text-soft)]">
                      {deck.description || "No note added."}
                    </div>
                  </div>
                  <div className="text-right text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                    {deck.wordCount} words
                    <div className="mt-1">{deck.dueCount} due</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <EditDeckDialog deck={deck} onSaved={onDecksChanged} />
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => handleDelete(deck.id)}
                    disabled={deck.isDefault || deletingId === deck.id}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {deletingId === deck.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[22px] border border-dashed border-[color:var(--line)] bg-[color:var(--surface-soft)] p-6 text-sm text-[color:var(--text-soft)]">
              No decks yet. Create your first one here.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EditDeckDialog({ deck, onSaved }: { deck: DeckSummary; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(deck.name);
  const [description, setDescription] = useState(deck.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    try {
      setError(null);
      setIsSaving(true);
      await updateDeck(deck.id, { name, description });
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update deck.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl">
          <PencilLine className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit deck</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[100px]" />

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateWord, type NotebookWord } from "@/lib/word-fetch";
import type { DeckSummary } from "@/lib/deck-fetch";

export function EditWordDialog({
  word,
  decks,
  onSaved,
}: {
  word: NotebookWord;
  decks: DeckSummary[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const availableDecks = decks.length
    ? decks
    : [{ id: "current-word-deck", name: word.deck, isDefault: false, wordCount: 0, dueCount: 0 }];
  const [form, setForm] = useState({ germanWord: word.germanWord, translation: word.translation, deck: word.deck, partOfSpeech: word.partOfSpeech, gender: word.gender ?? "", notes: word.notes ?? "", source: word.source, tags: word.tags.join(", ") });

  async function handleSave() {
    try {
      setError(null); setIsSaving(true);
      await updateWord(word.id, { ...form, tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean) });
      setOpen(false); onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to update word."); }
    finally { setIsSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm" className="rounded-xl">Edit</Button></DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>Edit word</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>German word</Label><Input value={form.germanWord} onChange={(e) => setForm({ ...form, germanWord: e.target.value })} /></div><div className="space-y-2"><Label>Translation</Label><Input value={form.translation} onChange={(e) => setForm({ ...form, translation: e.target.value })} /></div></div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2"><Label>Deck</Label><Select value={form.deck} onValueChange={(value) => setForm({ ...form, deck: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{availableDecks.map((deck) => <SelectItem key={deck.id} value={deck.name}>{deck.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Part of speech</Label><Select value={form.partOfSpeech} onValueChange={(value) => setForm({ ...form, partOfSpeech: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['noun','verb','adjective','adverb','phrase','other'].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Gender</Label><Select value={form.gender || 'none'} onValueChange={(value) => setForm({ ...form, gender: value === 'none' ? '' : value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">none</SelectItem><SelectItem value="der">der</SelectItem><SelectItem value="die">die</SelectItem><SelectItem value="das">das</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Source</Label><Select value={form.source} onValueChange={(value) => setForm({ ...form, source: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['manual','clipboard','linguee','pons','verbformen'].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Tags</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save changes'}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

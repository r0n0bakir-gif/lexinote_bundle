export type NotebookWord = {
  id: string;
  germanWord: string;
  translation: string;
  source: string;
  partOfSpeech: string;
  gender?: string;
  notes?: string;
  deck: string;
  deckId?: string | null;
  tags: string[];
  exampleSentence?: string;
  exampleTranslation?: string;
  synonyms?: string[];
  antonyms?: string[];
  createdAt: string;
};

export type WordFilters = {
  query?: string;
  deck?: string;
  source?: string;
  partOfSpeech?: string;
  tag?: string;
};

export async function fetchWords(filters: WordFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== "all") params.set(key, value);
  });
  const res = await fetch(`/api/words?${params.toString()}`, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to fetch words.");
  return data as { words: NotebookWord[]; meta: { decks: string[]; tags: string[] } };
}

export async function createManualWord(payload: any) {
  const res = await fetch("/api/words", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to save word.");
  return data.word;
}

export async function updateWord(id: string, payload: any) {
  const res = await fetch(`/api/words/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to update word.");
}

export async function deleteWord(id: string) {
  const res = await fetch(`/api/words/${id}`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to delete word.");
}

export type NotebookWord = {
  id: string;
  germanWord: string;
  translation: string;
  source: string;
  partOfSpeech: string;
  gender?: string;
  cefrLevel?: string | null;
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
  cefr?: string;
};

export async function fetchWords(
  filters: WordFilters = {},
  // WHY: AbortSignal lets the caller cancel an in-flight request when a new
  // keystroke triggers a fresh search before the previous one resolves.
  // Without this, responses can arrive out of order and overwrite newer results
  // with stale data (a classic "race to last write" bug in search inputs).
  signal?: AbortSignal
) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== "all") params.set(key, value);
  });
  const res = await fetch(`/api/words?${params.toString()}`, {
    cache: "no-store",
    signal,
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to fetch words.");
  return data as { words: NotebookWord[]; meta: { decks: string[]; tags: string[] } };
}

export async function createManualWord(payload: any) {
  const res = await fetch("/api/words", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to save word.");
  return data.word;
}

export async function updateWord(id: string, payload: any) {
  const res = await fetch(`/api/words/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to update word.");
}

export async function deleteWord(id: string) {
  const res = await fetch(`/api/words/${id}`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to delete word.");
}

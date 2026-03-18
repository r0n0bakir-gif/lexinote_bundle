export type DeckSummary = {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  isDefault: boolean;
  wordCount: number;
  dueCount: number;
};

export async function fetchDecks() {
  const res = await fetch("/api/decks", { cache: "no-store" });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to fetch decks.");
  return data.decks as DeckSummary[];
}

export async function createDeck(payload: { name: string; description?: string }) {
  const res = await fetch("/api/decks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to create deck.");
  return data.deck as DeckSummary;
}

export async function updateDeck(id: string, payload: { name: string; description?: string }) {
  const res = await fetch(`/api/decks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to update deck.");
  return data.deck as DeckSummary;
}

export async function deleteDeck(id: string) {
  const res = await fetch(`/api/decks/${id}`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to delete deck.");
}

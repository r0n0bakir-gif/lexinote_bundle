"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EnrichWordButton({ wordId, onDone }: { wordId: string; onDone?: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    try {
      setError(null); setIsLoading(true);
      const res = await fetch(`/api/words/${wordId}/enrich`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to enrich word.");
      onDone?.();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to enrich word."); }
    finally { setIsLoading(false); }
  }

  return <div className="space-y-2"><Button variant="outline" size="sm" className="rounded-xl" onClick={handleClick} disabled={isLoading}><Sparkles className="mr-2 h-4 w-4" />{isLoading ? "Enriching..." : "AI enrich"}</Button>{error ? <div className="text-xs text-red-400">{error}</div> : null}</div>;
}

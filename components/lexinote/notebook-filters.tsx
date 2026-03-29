"use client";

import { Loader2, Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type NotebookFilterState = {
  query: string;
  deck: string;
  source: string;
  partOfSpeech: string;
  tag: string;
  cefr: string;
};

// WHY: CEFR chips are color-coded by band so difficulty is visually scannable:
// green = beginner (A), amber = intermediate (B), violet = advanced (C).
const CEFR_CHIPS: { value: string; label: string; color: string }[] = [
  { value: "A1", label: "A1", color: "bg-[rgba(144,200,144,0.18)] text-[#4a8a4a] border-[rgba(144,200,144,0.4)]" },
  { value: "A2", label: "A2", color: "bg-[rgba(144,200,144,0.18)] text-[#4a8a4a] border-[rgba(144,200,144,0.4)]" },
  { value: "B1", label: "B1", color: "bg-[rgba(210,160,60,0.18)] text-[#8a6010] border-[rgba(210,160,60,0.4)]" },
  { value: "B2", label: "B2", color: "bg-[rgba(210,160,60,0.18)] text-[#8a6010] border-[rgba(210,160,60,0.4)]" },
  { value: "C1", label: "C1", color: "bg-[rgba(140,100,210,0.18)] text-[#6040a0] border-[rgba(140,100,210,0.4)]" },
  { value: "C2", label: "C2", color: "bg-[rgba(140,100,210,0.18)] text-[#6040a0] border-[rgba(140,100,210,0.4)]" },
];

export function NotebookFilters({
  filters,
  onFiltersChange,
  decks,
  tags,
  isSearching = false,
}: {
  filters: NotebookFilterState;
  onFiltersChange: (next: NotebookFilterState) => void;
  decks: string[];
  tags: string[];
  // WHY: isSearching drives the search-input spinner — the parent controls it
  // because the debounce and AbortController both live in the parent page, and
  // only the parent knows when a fetch is genuinely in-flight vs. just debouncing.
  isSearching?: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-[color:var(--line)] bg-[color:var(--surface)] p-4 shadow-[var(--shadow-md)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="eyebrow">Library filters</div>
          <div className="mt-2 text-lg font-semibold text-[color:var(--text)]">Refine what you see</div>
        </div>

        <div className="relative w-full max-w-xl">
          {/* WHY: Spinner replaces the static search icon while a debounced
              request is in-flight, giving instant tactile feedback that
              keystrokes were registered without feeling janky. */}
          {isSearching ? (
            <Loader2
              className={cn(
                "pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2",
                "animate-spin text-[color:var(--accent)]"
              )}
            />
          ) : (
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
          )}
          <Input
            className="pl-11"
            placeholder="Search words, translations, or notes"
            value={filters.query}
            onChange={(e) => onFiltersChange({ ...filters, query: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <FilterSelect
          label="Deck"
          value={filters.deck}
          onValueChange={(value) => onFiltersChange({ ...filters, deck: value })}
          options={["all", ...decks]}
          allLabel="All decks"
        />
<FilterSelect
          label="Type"
          value={filters.partOfSpeech}
          onValueChange={(value) => onFiltersChange({ ...filters, partOfSpeech: value })}
          options={["all", "noun", "verb", "adjective", "adverb", "phrase", "other"]}
          allLabel="All types"
        />
        <FilterSelect
          label="Tag"
          value={filters.tag}
          onValueChange={(value) => onFiltersChange({ ...filters, tag: value })}
          options={["all", ...tags]}
          allLabel="All tags"
        />
      </div>

      {/* ── CEFR level chips ── */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
          Level
        </span>
        <button
          type="button"
          onClick={() => onFiltersChange({ ...filters, cefr: "all" })}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition",
            (!filters.cefr || filters.cefr === "all")
              ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--text)]"
              : "border-[color:var(--line)] bg-transparent text-[color:var(--text-muted)] hover:border-[color:var(--line-strong)]"
          )}
        >
          All
        </button>
        {CEFR_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => onFiltersChange({ ...filters, cefr: chip.value })}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              filters.cefr === chip.value
                ? chip.color + " shadow-[var(--shadow-sm)]"
                : "border-[color:var(--line)] bg-transparent text-[color:var(--text-muted)] hover:border-[color:var(--line-strong)]"
            )}
          >
            {chip.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onFiltersChange({ ...filters, cefr: "unknown" })}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition",
            filters.cefr === "unknown"
              ? "border-[color:var(--line-strong)] bg-[color:var(--surface-strong)] text-[color:var(--text-soft)]"
              : "border-[color:var(--line)] bg-transparent text-[color:var(--text-muted)] hover:border-[color:var(--line-strong)]"
          )}
        >
          Unknown
        </button>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  allLabel: string;
}) {
  return (
    <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-3">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        {label}
      </div>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option === "all" ? allLabel : option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

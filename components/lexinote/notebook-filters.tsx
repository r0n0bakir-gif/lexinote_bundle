"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type NotebookFilterState = {
  query: string;
  deck: string;
  source: string;
  partOfSpeech: string;
  tag: string;
};

export function NotebookFilters({
  filters,
  onFiltersChange,
  decks,
  tags,
}: {
  filters: NotebookFilterState;
  onFiltersChange: (next: NotebookFilterState) => void;
  decks: string[];
  tags: string[];
}) {
  return (
    <div className="rounded-[24px] border border-[color:var(--line)] bg-[color:var(--surface)] p-4 shadow-[var(--shadow-md)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="eyebrow">Library filters</div>
          <div className="mt-2 text-lg font-semibold text-[color:var(--text)]">Refine what you see</div>
        </div>

        <div className="relative w-full max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
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
          label="Source"
          value={filters.source}
          onValueChange={(value) => onFiltersChange({ ...filters, source: value })}
          options={["all", "manual", "clipboard", "linguee", "pons", "verbformen"]}
          allLabel="All sources"
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

// WHY: A single source of truth for model names prevents the class of bug where
// a non-existent model string (e.g. "gpt-5-mini") is silently committed in
// multiple files. Import AI_MODELS everywhere — never inline a model string.
export const AI_MODELS = {
  // WHY: gpt-4o-mini is the smallest production-grade GPT-4o model as of 2025.
  // It is accurate enough for vocabulary enrichment and ~10x cheaper than gpt-4o.
  enrichment: "gpt-4o-mini",
  // WHY: fallback is referenced in error messages and future retry logic so callers
  // always have a named constant to reference rather than a bare string.
  fallback: "gpt-3.5-turbo",
} as const;

export type AiModelKey = keyof typeof AI_MODELS;

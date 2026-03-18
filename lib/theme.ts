export const themeOptions = [
  {
    value: "cozy",
    label: "Cozy",
    description: "Warm and soft",
  },
  {
    value: "linen",
    label: "Linen",
    description: "Bright and airy",
  },
  {
    value: "midnight",
    label: "Midnight",
    description: "Dark and focused",
  },
] as const;

export type LexiNoteTheme = (typeof themeOptions)[number]["value"];

export const defaultTheme: LexiNoteTheme = "cozy";

export function isValidTheme(value: unknown): value is LexiNoteTheme {
  return themeOptions.some((theme) => theme.value === value);
}

export function normalizeTheme(value: unknown): LexiNoteTheme {
  return isValidTheme(value) ? value : defaultTheme;
}

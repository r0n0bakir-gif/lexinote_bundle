export function cleanWord(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeWord(value: string) {
  return cleanWord(value).toLowerCase();
}

export function inferPartOfSpeech(word: string) {
  const value = cleanWord(word).toLowerCase();
  if (value.includes(" ")) return "phrase";
  if (value.endsWith("en") || value.endsWith("eln") || value.endsWith("ern")) return "verb";
  if (value.endsWith("ig") || value.endsWith("lich") || value.endsWith("isch")) return "adjective";
  return "other";
}

export function inferGender(word: string): "der" | "die" | "das" | null {
  const value = cleanWord(word).toLowerCase();
  if (value.startsWith("der ")) return "der";
  if (value.startsWith("die ")) return "die";
  if (value.startsWith("das ")) return "das";
  return null;
}

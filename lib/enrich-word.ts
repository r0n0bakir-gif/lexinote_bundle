import { getOpenAIClient } from "@/lib/ai";

export type EnrichmentResult = {
  partOfSpeech: "noun" | "verb" | "adjective" | "adverb" | "phrase" | "other";
  gender: "der" | "die" | "das" | null;
  exampleSentence: string | null;
  exampleTranslation: string | null;
  synonyms: string[];
  antonyms: string[];
};

function safeParseJson<T>(value: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error("AI returned invalid JSON.");
  }
}

function normalizeArray(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((item) => String(item).trim()).filter(Boolean).slice(0, 8);
}

function normalizePartOfSpeech(value: unknown): EnrichmentResult["partOfSpeech"] {
  const allowed = ["noun", "verb", "adjective", "adverb", "phrase", "other"] as const;
  const normalized = String(value ?? "other").trim().toLowerCase();
  return (allowed.includes(normalized as any) ? normalized : "other") as EnrichmentResult["partOfSpeech"];
}

function normalizeGender(value: unknown): EnrichmentResult["gender"] {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "der" || normalized === "die" || normalized === "das") return normalized;
  return null;
}

export async function generateWordEnrichment(input: { germanWord: string; translation?: string | null; notes?: string | null; }) {
  const openai = getOpenAIClient();
  const prompt = `You are enriching a German vocabulary flashcard for an intermediate to advanced learner.\n\nReturn ONLY valid JSON with this exact shape:\n{\n  "partOfSpeech": "noun|verb|adjective|adverb|phrase|other",\n  "gender": "der|die|das|null",\n  "exampleSentence": "string or null",\n  "exampleTranslation": "string or null",\n  "synonyms": ["string"],\n  "antonyms": ["string"]\n}\n\nRules:\n- The word is German.\n- Keep example sentence natural, concise, and learner-friendly.\n- If the word is not a noun, gender must be null.\n- Synonyms and antonyms should be useful German vocabulary items.\n- If antonyms are not appropriate, return an empty array.\n- Do not include markdown.\n- Do not include explanations.\n\nWord: ${input.germanWord}\nTranslation: ${input.translation ?? ""}\nNotes: ${input.notes ?? ""}`;

  const response = await openai.responses.create({ model: "gpt-5-mini", input: prompt });
  const text = response.output_text?.trim();
  if (!text) throw new Error("AI returned empty output.");
  const parsed = safeParseJson<any>(text);

  return {
    partOfSpeech: normalizePartOfSpeech(parsed.partOfSpeech),
    gender: normalizeGender(parsed.gender),
    exampleSentence: parsed.exampleSentence ? String(parsed.exampleSentence).trim() : null,
    exampleTranslation: parsed.exampleTranslation ? String(parsed.exampleTranslation).trim() : null,
    synonyms: normalizeArray(parsed.synonyms),
    antonyms: normalizeArray(parsed.antonyms),
  } satisfies EnrichmentResult;
}

import { getOpenAIClient } from "@/lib/ai";
import { AI_MODELS } from "@/lib/ai/config";

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type EnrichmentResult = {
  partOfSpeech: "noun" | "verb" | "adjective" | "adverb" | "phrase" | "other";
  gender: "der" | "die" | "das" | null;
  exampleSentence: string | null;
  exampleTranslation: string | null;
  synonyms: string[];
  antonyms: string[];
  cefrLevel: CefrLevel | null;
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
  return (allowed.includes(normalized as never) ? normalized : "other") as EnrichmentResult["partOfSpeech"];
}

function normalizeGender(value: unknown): EnrichmentResult["gender"] {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "der" || normalized === "die" || normalized === "das") return normalized;
  return null;
}

function normalizeCefrLevel(value: unknown): CefrLevel | null {
  const allowed: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const normalized = String(value ?? "").trim().toUpperCase();
  return (allowed.includes(normalized as CefrLevel) ? normalized : null) as CefrLevel | null;
}

export async function generateWordEnrichment(input: {
  germanWord: string;
  translation?: string | null;
  notes?: string | null;
}): Promise<EnrichmentResult> {
  const openai = getOpenAIClient();

  // WHY: Using triple-quote delimiters around the word isolates it from the rest
  // of the prompt, making prompt injection (e.g. a word like 'ignore all above')
  // structurally harder to exploit — the model sees it as a quoted value, not
  // as instruction text. Input is also pre-sanitized before reaching this point.
  const prompt = `You are enriching a German vocabulary flashcard for an intermediate to advanced learner.

Return ONLY valid JSON with this exact shape:
{
  "partOfSpeech": "noun|verb|adjective|adverb|phrase|other",
  "gender": "der|die|das|null",
  "exampleSentence": "string or null",
  "exampleTranslation": "string or null",
  "synonyms": ["string"],
  "antonyms": ["string"],
  "cefrLevel": "A1|A2|B1|B2|C1|C2|null"
}

Rules:
- The word is German.
- Keep example sentence natural, concise, and learner-friendly.
- If the word is not a noun, gender must be null.
- Synonyms and antonyms should be useful German vocabulary items.
- If antonyms are not appropriate, return an empty array.
- cefrLevel is the CEFR difficulty level of the word (A1=beginner, C2=mastery). Use null if uncertain.
- Do not include markdown.
- Do not include explanations outside the JSON object.

The German word to enrich is: """${input.germanWord}"""
Translation: ${input.translation ?? ""}
Notes: ${input.notes ?? ""}`;

  // WHY: Using chat.completions.create (stable v4 SDK API) instead of
  // openai.responses.create which was introduced in a later SDK version and
  // is not available in openai@4.x. response_format: json_object forces the
  // model to always return valid JSON, eliminating markdown-wrapped responses.
  const completion = await openai.chat.completions.create({
    model: AI_MODELS.enrichment,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.3, // WHY: Low temperature for consistent, factual vocabulary data.
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("AI returned empty output.");

  const parsed = safeParseJson<Record<string, unknown>>(text);

  return {
    partOfSpeech: normalizePartOfSpeech(parsed.partOfSpeech),
    gender: normalizeGender(parsed.gender),
    exampleSentence: parsed.exampleSentence ? String(parsed.exampleSentence).trim() : null,
    exampleTranslation: parsed.exampleTranslation ? String(parsed.exampleTranslation).trim() : null,
    synonyms: normalizeArray(parsed.synonyms),
    antonyms: normalizeArray(parsed.antonyms),
    cefrLevel: normalizeCefrLevel(parsed.cefrLevel),
  } satisfies EnrichmentResult;
}

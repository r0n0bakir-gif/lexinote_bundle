import OpenAI from "openai";
import { hasRequiredAiEnvVars } from "@/lib/env";
import { AI_MODELS } from "@/lib/ai/config";

// WHY: Module-level flag ensures the health check runs exactly once per server
// process lifetime (not once per request). Next.js long-lived server processes
// make this safe — the check happens on cold start, not on every user request.
let modelChecked = false;

export function getOpenAIClient(): OpenAI {
  if (!hasRequiredAiEnvVars()) {
    throw new Error("Missing OPENAI_API_KEY. Add it to .env.local.");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // WHY: Fire-and-forget — does NOT block or throw to the caller. The health
  // check is informational only: it surfaces misconfiguration in server logs
  // (visible in Vercel/Railway/local terminal) without degrading request latency.
  if (!modelChecked) {
    modelChecked = true;
    verifyModelAvailability(client).catch((err) => {
      console.warn(
        "[LexiNote/AI] Model availability check failed:",
        err instanceof Error ? err.message : String(err)
      );
    });
  }

  return client;
}

// WHY: Calls GET /v1/models (OpenAI's model list endpoint) to confirm the
// configured enrichment model is accessible with the current API key.
// This catches wrong model names, restricted API keys, and org-level model
// access issues before they silently fail in production enrichment calls.
async function verifyModelAvailability(client: OpenAI): Promise<void> {
  const models = await client.models.list();
  const available = models.data.some((m) => m.id === AI_MODELS.enrichment);

  if (!available) {
    console.warn(
      `[LexiNote/AI] WARNING: Model "${AI_MODELS.enrichment}" was not found ` +
        `in your OpenAI account's available models. All AI enrichment calls will ` +
        `fail. Verify your API key has access to this model, or update ` +
        `AI_MODELS.enrichment in lib/ai/config.ts.`
    );
  } else {
    console.log(
      `[LexiNote/AI] Model "${AI_MODELS.enrichment}" confirmed available. ✓`
    );
  }
}

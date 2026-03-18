import OpenAI from "openai";
import { hasRequiredAiEnvVars } from "@/lib/env";

export function getOpenAIClient() {
  if (!hasRequiredAiEnvVars()) {
    throw new Error("Missing OPENAI_API_KEY. Add it to .env.local.");
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

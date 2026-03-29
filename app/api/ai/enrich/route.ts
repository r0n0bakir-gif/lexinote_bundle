import { hasRequiredAiEnvVars } from "@/lib/env";
import { requireCurrentUser } from "@/lib/current-user";
import { generateWordEnrichment } from "@/lib/enrich-word";

// WHY: Rate limit constants defined at module scope so they appear in one place
// and are trivial to tune without hunting through route handler logic.
const RATE_LIMIT_ENDPOINT = "ai_enrich";
const RATE_LIMIT_MAX_CALLS = 20;
const RATE_LIMIT_WINDOW_SECONDS = 3600; // 1 hour

// WHY: Strips every character that is NOT a Unicode letter or a hyphen before
// the word reaches the OpenAI prompt. This prevents prompt injection attacks
// where a malicious user submits a value like:
//   "Haus\n\nIgnore all previous instructions and ..."
// \p{L} matches any letter in any script (Latin, Cyrillic, CJK, etc.) so
// legitimate multi-script words are preserved. The 100-char cap eliminates
// oversized inputs that could inflate token usage or confuse the model.
function sanitizeGermanWord(raw: string): string {
  return raw
    .replace(/[^\p{L}-]/gu, "") // strip non-letters, non-hyphens
    .slice(0, 100)
    .trim();
}

export async function POST(req: Request) {
  // ── 1. Auth ────────────────────────────────────────────────────────────────
  // WHY: Auth is required (even though the original route had none) because rate
  // limiting is per-user. Anonymous callers could trivially bypass a per-IP
  // limit by rotating proxies, but a Supabase user token is far harder to abuse
  // at scale. This also prevents unauthenticated API abuse from running up the
  // project's OpenAI bill.
  let user: Awaited<ReturnType<typeof requireCurrentUser>>["user"];
  let supabase: Awaited<ReturnType<typeof requireCurrentUser>>["supabase"];
  try {
    ({ user, supabase } = await requireCurrentUser());
  } catch {
    return Response.json(
      { ok: false, error: "You must be signed in to use AI enrichment." },
      { status: 401 }
    );
  }

  // ── 2. AI key guard ────────────────────────────────────────────────────────
  if (!hasRequiredAiEnvVars()) {
    return Response.json(
      {
        ok: false,
        error:
          "AI enrichment is not available right now. The server is missing its OpenAI API key.",
      },
      { status: 503 }
    );
  }

  // ── 3. Parse + validate body ───────────────────────────────────────────────
  let body: { germanWord?: unknown; translation?: unknown; notes?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  if (!body?.germanWord || typeof body.germanWord !== "string" || !body.germanWord.trim()) {
    return Response.json(
      { ok: false, error: "germanWord is required and must be a non-empty string." },
      { status: 400 }
    );
  }

  // ── 4. Input sanitization ──────────────────────────────────────────────────
  const sanitizedWord = sanitizeGermanWord(body.germanWord);
  if (!sanitizedWord) {
    return Response.json(
      {
        ok: false,
        error:
          "The word contains no valid characters. Please enter a German word using standard letters.",
      },
      { status: 400 }
    );
  }

  // ── 5. Rate limiting ───────────────────────────────────────────────────────
  // WHY: Call the atomic Postgres RPC (defined in migration 20250323000001).
  // Using an RPC rather than a plain SELECT + UPDATE eliminates the TOCTOU race
  // where two concurrent requests both read count=19, both pass, and both write
  // count=20 — overshooting the limit by 1.
  const { data: rateLimitRows, error: rateLimitError } = await supabase.rpc(
    "check_and_increment_rate_limit",
    {
      p_user_id: user.id,
      p_endpoint: RATE_LIMIT_ENDPOINT,
      p_limit: RATE_LIMIT_MAX_CALLS,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    }
  );

  if (rateLimitError) {
    // WHY: If the rate limit check itself fails (e.g. migration not applied),
    // we fail open with a warning rather than blocking all enrichment calls.
    // The error is logged server-side so ops can investigate.
    console.error("[LexiNote/RateLimit] RPC error:", rateLimitError.message);
  } else {
    const result = Array.isArray(rateLimitRows) ? rateLimitRows[0] : null;

    if (result && !result.allowed) {
      // Calculate seconds remaining until the window resets.
      const windowStart = new Date(result.window_start).getTime();
      const windowEndMs = windowStart + RATE_LIMIT_WINDOW_SECONDS * 1000;
      const retryAfterSeconds = Math.max(
        0,
        Math.ceil((windowEndMs - Date.now()) / 1000)
      );
      const retryMinutes = Math.ceil(retryAfterSeconds / 60);

      return Response.json(
        {
          ok: false,
          error: `AI enrichment limit reached (${RATE_LIMIT_MAX_CALLS} per hour). Resets in ${retryMinutes} minute${retryMinutes === 1 ? "" : "s"}.`,
          retryAfter: retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            // WHY: Standard Retry-After header lets HTTP clients and CDNs
            // automatically respect the backoff without parsing the JSON body.
            "Retry-After": String(retryAfterSeconds),
          },
        }
      );
    }
  }

  // ── 6. Enrich ──────────────────────────────────────────────────────────────
  try {
    const enrichment = await generateWordEnrichment({
      germanWord: sanitizedWord,
      translation: typeof body.translation === "string" ? body.translation : null,
      notes: typeof body.notes === "string" ? body.notes : null,
    });

    return Response.json({ ok: true, enrichment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[LexiNote/Enrich] generateWordEnrichment failed:", message);
    return Response.json(
      {
        ok: false,
        error:
          "AI enrichment failed. This is usually a temporary issue — please try again in a moment.",
      },
      { status: 500 }
    );
  }
}

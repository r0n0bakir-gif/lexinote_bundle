import { generateWordEnrichment } from "@/lib/enrich-word";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.germanWord?.trim()) {
      return Response.json({ ok: false, error: "germanWord is required." }, { status: 400 });
    }
    const enrichment = await generateWordEnrichment({ germanWord: body.germanWord, translation: body.translation ?? null, notes: body.notes ?? null });
    return Response.json({ ok: true, enrichment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

import { ensureProfile } from "@/lib/ensure-profile";

export async function POST() {
  try {
    const user = await ensureProfile();
    return Response.json({ ok: true, user: { id: user.id, email: user.email } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}

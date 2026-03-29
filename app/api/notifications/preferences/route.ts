import { requireCurrentUser } from "@/lib/current-user";

const ALLOWED_FIELDS = ["push_notifications_enabled", "email_reminders_enabled", "reminder_time"] as const;
type AllowedField = (typeof ALLOWED_FIELDS)[number];

// WHY: reminder_time is stored as "HH:MM" text. Validate the format server-side
// so the Edge Function never receives a malformed time string.
function isValidReminderTime(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^\d{2}:\d{2}$/.test(value);
}

export async function GET() {
  try {
    const { user, supabase } = await requireCurrentUser();

    const { data, error } = await supabase
      .from("profiles")
      .select("push_notifications_enabled, email_reminders_enabled, reminder_time")
      .eq("id", user.id)
      .single();

    if (error) throw new Error(error.message);

    return Response.json({
      ok: true,
      preferences: {
        pushEnabled: data.push_notifications_enabled ?? false,
        emailEnabled: data.email_reminders_enabled ?? false,
        reminderTime: data.reminder_time ?? "20:00",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const { user, supabase } = await requireCurrentUser();
    const body = await req.json();

    const updates: Partial<Record<AllowedField, unknown>> = {};

    if (typeof body.pushEnabled === "boolean") {
      updates.push_notifications_enabled = body.pushEnabled;
    }
    if (typeof body.emailEnabled === "boolean") {
      updates.email_reminders_enabled = body.emailEnabled;
    }
    if (body.reminderTime !== undefined) {
      if (!isValidReminderTime(body.reminderTime)) {
        return Response.json(
          { ok: false, error: "reminderTime must be in HH:MM format." },
          { status: 400 }
        );
      }
      updates.reminder_time = body.reminderTime;
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ ok: false, error: "No valid fields to update." }, { status: 400 });
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (error) throw new Error(error.message);

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}

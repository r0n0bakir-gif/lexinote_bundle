// Supabase Edge Function: daily-reminder
// Schedule: "0 18 * * *" (6 PM UTC) — runs once per day.
//
// Logic:
//   1. Query profiles where email_reminders_enabled = true AND last study date < today.
//   2. For each user compute due card count.
//   3. Send a reminder email via Resend.
//
// Required secrets (set via `supabase secrets set`):
//   RESEND_API_KEY   — Resend API key
//   FROM_EMAIL       — verified sender address, e.g. "noreply@yourdomain.com"
//   APP_URL          — public app URL, e.g. "https://lexinote.app"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "noreply@lexinote.app";
const APP_URL = Deno.env.get("APP_URL") ?? "https://lexinote.app";

// WHY: Use the service-role key so we can query all users' profiles without
// RLS blocking cross-user reads. This key must NEVER be exposed client-side.
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (_req) => {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set — aborting daily-reminder.");
    return new Response("RESEND_API_KEY not configured", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const todayUtc = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  // ── 1. Fetch eligible users ─────────────────────────────────────────────────
  // WHY: We join auth.users to get the email address, which lives in Supabase
  // Auth rather than in our profiles table (avoids duplication / sync drift).
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email_reminders_enabled, reminder_time")
    .eq("email_reminders_enabled", true);

  if (profilesError) {
    console.error("Failed to fetch profiles:", profilesError.message);
    return new Response("DB error", { status: 500 });
  }

  if (!profiles || profiles.length === 0) {
    return new Response("No eligible users", { status: 200 });
  }

  // ── 2. Filter by last study date < today ────────────────────────────────────
  // WHY: Fetch daily_stats for today — users who already studied today don't
  // need a reminder. We do a single query covering all user IDs rather than
  // N individual queries.
  const userIds = profiles.map((p) => p.id);

  const { data: todayStats } = await supabase
    .from("daily_stats")
    .select("user_id")
    .in("user_id", userIds)
    .eq("stat_date", todayUtc)
    .gt("cards_reviewed", 0);

  const studiedTodaySet = new Set((todayStats ?? []).map((s: any) => s.user_id));
  const usersToRemind = profiles.filter((p) => !studiedTodaySet.has(p.id));

  if (usersToRemind.length === 0) {
    console.log("All users already studied today — no reminders needed.");
    return new Response("All caught up", { status: 200 });
  }

  // ── 3. Fetch due card counts and streak data per user ───────────────────────
  const nowIso = new Date().toISOString();

  const results = await Promise.allSettled(
    usersToRemind.map(async (profile) => {
      // Due card count.
      const { count: dueCount } = await supabase
        .from("words")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("is_learned", false)
        .lte("due_at", nowIso);

      // Current streak: count consecutive days with cards_reviewed > 0
      // ending yesterday (today not yet studied).
      const { data: streakRows } = await supabase
        .from("daily_stats")
        .select("stat_date, cards_reviewed")
        .eq("user_id", profile.id)
        .gt("cards_reviewed", 0)
        .order("stat_date", { ascending: false })
        .limit(365);

      let streak = 0;
      if (streakRows && streakRows.length > 0) {
        const yesterday = new Date();
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        let expected = yesterday.toISOString().slice(0, 10);
        for (const row of streakRows) {
          if (row.stat_date === expected) {
            streak++;
            const d = new Date(expected);
            d.setUTCDate(d.getUTCDate() - 1);
            expected = d.toISOString().slice(0, 10);
          } else {
            break;
          }
        }
      }

      // Get user email from auth.users via admin API.
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
      const email = authUser?.user?.email;
      const name = authUser?.user?.user_metadata?.full_name ?? "there";

      if (!email) {
        console.warn(`No email for user ${profile.id} — skipping.`);
        return { skipped: true };
      }

      await sendReminderEmail({ email, name, dueCount: dueCount ?? 0, streak });
      return { sent: true, email };
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled" && (r.value as any).sent).length;
  const skipped = results.filter(
    (r) => r.status === "fulfilled" && (r.value as any).skipped
  ).length;
  const failed = results.filter((r) => r.status === "rejected").length;

  console.log(`Daily reminder complete: ${sent} sent, ${skipped} skipped, ${failed} failed.`);
  return new Response(
    JSON.stringify({ ok: true, sent, skipped, failed }),
    { headers: { "Content-Type": "application/json" } }
  );
});

// ── Email helper ───────────────────────────────────────────────────────────────

async function sendReminderEmail({
  email,
  name,
  dueCount,
  streak,
}: {
  email: string;
  name: string;
  dueCount: number;
  streak: number;
}) {
  const studyUrl = `${APP_URL}/study`;
  const streakLine =
    streak > 0
      ? `Don't break your ${streak}-day streak!`
      : "Start a streak today — every day counts.";

  const duePhrase =
    dueCount === 0
      ? "You have no cards due right now, but a quick review session keeps your German sharp."
      : `You have ${dueCount} word${dueCount !== 1 ? "s" : ""} due today.`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f5f3ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ef;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1a1a18;padding:32px 40px;">
            <div style="font-size:22px;font-weight:700;color:#f5f3ef;letter-spacing:-0.5px;">LexiNote</div>
            <div style="font-size:12px;color:#9e9e8e;margin-top:4px;letter-spacing:0.1em;text-transform:uppercase;">Daily reminder</div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h1 style="margin:0 0 16px;font-size:28px;font-weight:700;color:#1a1a18;line-height:1.3;">
              Your German streak is waiting 🔥
            </h1>
            <p style="margin:0 0 12px;font-size:16px;color:#4a4a42;line-height:1.6;">
              Hi ${name},
            </p>
            <p style="margin:0 0 12px;font-size:16px;color:#4a4a42;line-height:1.6;">
              ${duePhrase} ${streakLine}
            </p>
            <div style="margin:32px 0;">
              <a href="${studyUrl}" style="display:inline-block;background:#1a1a18;color:#f5f3ef;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:600;letter-spacing:0.02em;">
                Study Now →
              </a>
            </div>
            <p style="margin:0;font-size:13px;color:#9e9e8e;line-height:1.6;">
              Short sessions beat postponed perfect ones. Even 5 minutes maintains the habit.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f5f3ef;padding:24px 40px;border-top:1px solid #e8e5e0;">
            <p style="margin:0;font-size:12px;color:#9e9e8e;">
              You're receiving this because you enabled email reminders in LexiNote.
              <a href="${APP_URL}/settings" style="color:#6a6a5e;">Manage preferences</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: email,
      subject: "Your German streak is waiting 🔥",
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

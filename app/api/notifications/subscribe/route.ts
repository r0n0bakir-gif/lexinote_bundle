import { requireCurrentUser } from "@/lib/current-user";

export async function POST(req: Request) {
  try {
    const { user, supabase } = await requireCurrentUser();
    const body = await req.json();

    const { endpoint, p256dh, auth } = body;
    if (!endpoint || !p256dh || !auth) {
      return Response.json({ ok: false, error: "endpoint, p256dh, and auth are required." }, { status: 400 });
    }

    // WHY: Upsert on (user_id, endpoint) so re-subscribing from the same
    // browser (e.g. after a SW update) cleanly updates the stored keys rather
    // than accumulating duplicate rows.
    const { error } = await supabase
      .from("notification_subscriptions")
      .upsert(
        { user_id: user.id, endpoint, p256dh, auth },
        { onConflict: "user_id,endpoint" }
      );

    if (error) throw new Error(error.message);

    // Mark push notifications as enabled on the user's profile so the
    // daily-reminder Edge Function knows this user opted in.
    await supabase
      .from("profiles")
      .update({ push_notifications_enabled: true })
      .eq("id", user.id);

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    const { user, supabase } = await requireCurrentUser();
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint");

    if (endpoint) {
      // Remove a specific subscription (browser unsubscribed).
      await supabase
        .from("notification_subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("endpoint", endpoint);
    } else {
      // Remove all subscriptions for this user (global opt-out).
      await supabase
        .from("notification_subscriptions")
        .delete()
        .eq("user_id", user.id);
    }

    await supabase
      .from("profiles")
      .update({ push_notifications_enabled: false })
      .eq("id", user.id);

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}

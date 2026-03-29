"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Mail, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

type Preferences = {
  pushEnabled: boolean;
  emailEnabled: boolean;
  reminderTime: string;
};

async function fetchPreferences(): Promise<Preferences> {
  const res = await fetch("/api/notifications/preferences");
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load preferences.");
  return data.preferences;
}

async function patchPreferences(updates: Partial<Preferences>) {
  const res = await fetch("/api/notifications/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to save preferences.");
}

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const push = usePushNotifications();

  useEffect(() => {
    fetchPreferences()
      .then(setPrefs)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleTogglePush() {
    if (!prefs) return;
    setError(null);

    if (!prefs.pushEnabled) {
      // Subscribing — go through the Web Push permission flow.
      const ok = await push.subscribe();
      if (!ok) {
        if (push.permissionState === "denied") {
          setError("Browser notifications are blocked. Enable them in your browser settings.");
        }
        return;
      }
      setPrefs((p) => p && { ...p, pushEnabled: true });
    } else {
      // Unsubscribing — revoke the push subscription locally and server-side.
      await push.unsubscribe();
      const endpoint = push.subscription?.endpoint;
      await fetch(
        `/api/notifications/subscribe${endpoint ? `?endpoint=${encodeURIComponent(endpoint)}` : ""}`,
        { method: "DELETE" }
      );
      setPrefs((p) => p && { ...p, pushEnabled: false });
    }
  }

  async function handleToggleEmail() {
    if (!prefs) return;
    setError(null);
    const next = !prefs.emailEnabled;
    setPrefs((p) => p && { ...p, emailEnabled: next });
    try {
      await patchPreferences({ emailEnabled: next });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update.");
      setPrefs((p) => p && { ...p, emailEnabled: !next });
    }
  }

  async function handleSaveTime() {
    if (!prefs) return;
    setIsSaving(true);
    setError(null);
    try {
      await patchPreferences({ reminderTime: prefs.reminderTime });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-[color:var(--text-soft)]">
          Loading notification settings…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Reminders
        </CardTitle>
        <CardDescription>
          Get nudged when you have cards due. Keeps streaks alive without any extra effort.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {error && (
          <div className="rounded-[16px] border border-[#d99e95] bg-[#fff1ed] px-4 py-3 text-sm text-[#9b4f42]">
            {error}
          </div>
        )}

        {/* ── Push notifications ── */}
        <div className="flex items-start justify-between gap-4 rounded-[20px] border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-5">
          <div className="flex items-start gap-3">
            {prefs?.pushEnabled ? (
              <Bell className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--accent)]" />
            ) : (
              <BellOff className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--text-muted)]" />
            )}
            <div>
              <div className="font-medium text-[color:var(--text)]">Browser push</div>
              <div className="mt-1 text-sm text-[color:var(--text-soft)]">
                Instant notification in your browser, even when the tab is closed.
              </div>
              {!push.supported && (
                <div className="mt-2 text-xs text-[color:var(--text-muted)]">
                  Push notifications are not supported in this browser.
                </div>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant={prefs?.pushEnabled ? "outline" : "default"}
            disabled={!push.supported || push.isSubscribing}
            onClick={handleTogglePush}
            className="shrink-0"
          >
            {push.isSubscribing ? "Enabling…" : prefs?.pushEnabled ? "Disable" : "Enable"}
          </Button>
        </div>

        {/* ── Email reminders ── */}
        <div className="flex items-start justify-between gap-4 rounded-[20px] border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-5">
          <div className="flex items-start gap-3">
            <Mail className={`mt-0.5 h-5 w-5 shrink-0 ${prefs?.emailEnabled ? "text-[color:var(--accent)]" : "text-[color:var(--text-muted)]"}`} />
            <div>
              <div className="font-medium text-[color:var(--text)]">Email reminders</div>
              <div className="mt-1 text-sm text-[color:var(--text-soft)]">
                A daily nudge to your inbox when you haven't studied yet.
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant={prefs?.emailEnabled ? "outline" : "default"}
            onClick={handleToggleEmail}
            className="shrink-0"
          >
            {prefs?.emailEnabled ? "Disable" : "Enable"}
          </Button>
        </div>

        {/* ── Reminder time ── */}
        {(prefs?.pushEnabled || prefs?.emailEnabled) && (
          <div className="flex items-center justify-between gap-4 rounded-[20px] border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-5">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 shrink-0 text-[color:var(--text-muted)]" />
              <div>
                <div className="font-medium text-[color:var(--text)]">Reminder time</div>
                <div className="mt-1 text-xs text-[color:var(--text-soft)]">
                  Your local time — reminders are sent around this hour.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={prefs?.reminderTime ?? "20:00"}
                onChange={(e) => setPrefs((p) => p && { ...p, reminderTime: e.target.value })}
                className="rounded-[12px] border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text)] outline-none focus:border-[color:var(--accent)]"
              />
              <Button size="sm" onClick={handleSaveTime} disabled={isSaving}>
                {saved ? "Saved" : isSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// LexiNote Service Worker — handles Web Push notifications and offline caching.
// Manifest V3 extension note: this SW is for the web app only, not the extension.

const CACHE_NAME = "lexinote-v1";

// ── Install ────────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  // WHY: skipWaiting activates the new SW immediately rather than waiting for
  // all existing tabs to close. For a study app this is preferable — users
  // should always get the latest build without needing to reload every tab.
  self.skipWaiting();
});

// ── Activate ───────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    // WHY: clients.claim() makes this SW immediately control all open tabs
    // so push notifications work without requiring a page reload after install.
    clients.claim()
  );
});

// ── Push event ─────────────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  // WHY: Guard against malformed push payloads — always parse safely.
  let payload = {
    title: "LexiNote",
    body: "Your German words are waiting. Keep your streak alive!",
    url: "/study",
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  const options = {
    body: payload.body,
    icon: "/icon-192.png",   // WHY: Shown in the notification tray — reference your PWA icon.
    badge: "/icon-192.png",
    data: { url: payload.url },
    // WHY: vibrate provides haptic feedback on Android — single short pulse
    // is enough to draw attention without being obnoxious.
    vibrate: [200],
    tag: "lexinote-daily",   // WHY: tag deduplicates — new push replaces the old one rather than stacking.
    renotify: true,          // WHY: renotify: true re-vibrates even with the same tag (new day, new urgency).
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// ── Notification click ─────────────────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? "/study";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // WHY: If the app is already open in a tab, focus it rather than opening
      // a duplicate. Only open a new tab if no existing tab is found.
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});

import { useCallback, useEffect, useState } from "react";

// WHY: VAPID (Voluntary Application Server Identification) is required by the
// Push API spec. The public key is safe to expose client-side — it only
// identifies the application server, not grant any permissions.
// Generate a key pair with: npx web-push generate-vapid-keys
// Then set NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env.local and VAPID_PRIVATE_KEY
// as a server-only secret.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

// WHY: Convert base64url-encoded VAPID public key to Uint8Array as required
// by pushManager.subscribe(). The Web Push API spec mandates this encoding.
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0))).buffer as ArrayBuffer;
}

export type PushPermissionState = "default" | "granted" | "denied" | "unsupported";

export function usePushNotifications() {
  const [permissionState, setPermissionState] = useState<PushPermissionState>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    Boolean(VAPID_PUBLIC_KEY);

  useEffect(() => {
    if (!supported) {
      setPermissionState("unsupported");
      return;
    }

    setPermissionState(Notification.permission as PushPermissionState);

    // WHY: Check if we already have an active subscription (e.g. user previously
    // granted permission). Restore it so the UI reflects true state on reload.
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscription(sub);
        if (sub) setPermissionState("granted");
      });
    });
  }, [supported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;
    setError(null);
    setIsSubscribing(true);

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission as PushPermissionState);

      if (permission !== "granted") return false;

      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true, // WHY: Required by browsers — hidden push events are not allowed.
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      setSubscription(sub);

      // Persist the subscription on the server so we can send pushes later.
      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          // WHY: keys are base64-encoded for safe JSON transport.
          p256dh: sub.toJSON().keys?.p256dh,
          auth: sub.toJSON().keys?.auth,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save push subscription.");
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Push subscription failed.");
      return false;
    } finally {
      setIsSubscribing(false);
    }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return;
    await subscription.unsubscribe();
    setSubscription(null);
    setPermissionState("default");
  }, [subscription]);

  return {
    supported,
    permissionState,
    subscription,
    isSubscribing,
    error,
    subscribe,
    unsubscribe,
  };
}

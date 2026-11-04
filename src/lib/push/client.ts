"use client";

import { toast } from "sonner";
import { publicEnv } from "@/lib/env";
import { removePushSubscription, savePushSubscription } from "@/app/actions/notification-channels";

const OFFER_KEY = "rumi.push-offered";

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    publicEnv.pushEnabled &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function keyBytes(base64url: string) {
  const padded = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  return (
    (await navigator.serviceWorker.getRegistration("/")) ??
    navigator.serviceWorker.register("/sw.js", { scope: "/" })
  );
}

export async function currentPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  try {
    return await (await registration()).pushManager.getSubscription();
  } catch {
    return null;
  }
}

/** Asks for permission (only ever from a tap) and saves this browser's subscription. */
export async function subscribePush(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!pushSupported())
    return {
      ok: false,
      error:
        "This browser can't get push notifications. On iPhone, add Rumi to your Home Screen first.",
    };
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    return { ok: false, error: "Notifications are blocked for Rumi in your browser settings." };
  try {
    const reg = await registration();
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(publicEnv.vapidPublicKey),
      }));
    const json = sub.toJSON();
    const result = await savePushSubscription({
      endpoint: sub.endpoint,
      keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
      userAgent: navigator.userAgent.slice(0, 300),
    });
    if (!result.ok) {
      await sub.unsubscribe().catch(() => undefined);
      return result;
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't turn on push. Try again." };
  }
}

export async function unsubscribePush(): Promise<{ ok: true } | { ok: false; error: string }> {
  const sub = await currentPushSubscription();
  if (!sub) return { ok: true };
  const result = await removePushSubscription(sub.endpoint);
  await sub.unsubscribe().catch(() => undefined);
  return result.ok ? { ok: true } : result;
}

/**
 * After a meaningful action (an intro sent, a group joined), offers push once per browser.
 * The browser's permission prompt only appears if the student taps "Turn on".
 */
export function offerPush(reason: string) {
  if (!pushSupported() || Notification.permission !== "default") return;
  try {
    if (localStorage.getItem(OFFER_KEY)) return;
    localStorage.setItem(OFFER_KEY, new Date().toISOString());
  } catch {
    return;
  }
  toast(reason, {
    description: "Get a push notification on this device when they answer.",
    duration: 12000,
    action: {
      label: "Turn on",
      onClick: () =>
        void subscribePush().then((r) => {
          if (r.ok) toast.success("Push is on for messages and deadlines.");
          else toast.error(r.error);
        }),
    },
  });
}

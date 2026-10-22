"use client";

import { useState, useTransition } from "react";
import { savePushSubscription } from "@/app/actions/push";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushEnableButton() {
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!vapid) {
    return (
      <p className="text-xs text-ink-muted">
        Web Push activates when `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (+ `VAPID_PRIVATE_KEY`) is configured.
        In-app and email notifications already work.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
                setStatus("Push not supported in this browser.");
                return;
              }
              const permission = await Notification.requestPermission();
              if (permission !== "granted") {
                setStatus("Permission denied.");
                return;
              }
              const reg = await navigator.serviceWorker.ready;
              const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapid),
              });
              const json = sub.toJSON();
              const res = await savePushSubscription({
                endpoint: json.endpoint!,
                keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
              });
              setStatus(res.error ?? "Push enabled.");
            } catch (e) {
              setStatus(e instanceof Error ? e.message : "Failed to enable push");
            }
          })
        }
      >
        Enable push notifications
      </Button>
      {status ? <p className="text-xs text-ink-muted">{status}</p> : null}
    </div>
  );
}

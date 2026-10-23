"use client";

import * as React from "react";
import { saveProfileAndPrefs, type PrefsPatch, type ProfilePatch } from "@/app/actions/onboarding";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface Pending {
  profile: ProfilePatch;
  prefs: PrefsPatch;
  step?: number;
}

const empty = (): Pending => ({ profile: {}, prefs: {} });

/**
 * Accumulates field changes and saves them after a short pause. Failed saves
 * are re-queued, so nothing typed is lost; `flush` forces a save (on Continue).
 */
export function useAutosave(delay = 700, saver: typeof saveProfileAndPrefs = saveProfileAndPrefs) {
  const [status, setStatus] = React.useState<SaveStatus>("idle");
  const pending = React.useRef<Pending>(empty());
  const timer = React.useRef<ReturnType<typeof setTimeout>>();
  const inflight = React.useRef<Promise<boolean> | null>(null);

  const flush = React.useCallback(async (): Promise<boolean> => {
    clearTimeout(timer.current);
    if (inflight.current) await inflight.current;
    const batch = pending.current;
    const hasWork =
      Object.keys(batch.profile).length > 0 || Object.keys(batch.prefs).length > 0 || batch.step !== undefined;
    if (!hasWork) return true;
    pending.current = empty();
    setStatus("saving");
    const run = saver(batch)
      .then((result) => {
        if (!result.ok) throw new Error(result.error);
        setStatus("saved");
        return true;
      })
      .catch(() => {
        // Put the batch back underneath anything typed since.
        pending.current = {
          profile: { ...batch.profile, ...pending.current.profile },
          prefs: { ...batch.prefs, ...pending.current.prefs },
          step: pending.current.step ?? batch.step,
        };
        setStatus("error");
        return false;
      })
      .finally(() => {
        inflight.current = null;
      });
    inflight.current = run;
    return run;
  }, [saver]);

  const queue = React.useCallback(
    (patch: Partial<Pending>) => {
      pending.current = {
        profile: { ...pending.current.profile, ...patch.profile },
        prefs: { ...pending.current.prefs, ...patch.prefs },
        step: patch.step ?? pending.current.step,
      };
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), delay);
    },
    [delay, flush],
  );

  // Last-chance save when the tab is hidden or closed.
  React.useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      clearTimeout(timer.current);
    };
  }, [flush]);

  return { status, queue, flush };
}

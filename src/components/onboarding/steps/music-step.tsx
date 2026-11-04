"use client";

import * as React from "react";
import { Check, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showSpotifyStatus } from "@/components/settings/spotify-status";
import { useT } from "@/components/providers/i18n";

export function MusicStep({
  connected,
  displayName,
  artists,
  returnTo,
}: {
  connected: boolean;
  displayName: string | null;
  artists: string[];
  returnTo: string;
}) {
  const t = useT("onboarding");
  const ta = useT("accounts");
  React.useEffect(() => {
    const url = new URL(window.location.href);
    if (showSpotifyStatus(url.searchParams.get("spotify"), ta)) {
      url.searchParams.delete("spotify");
      window.history.replaceState(window.history.state, "", url);
    }
  }, [ta]);

  if (connected) {
    return (
      <div className="flex flex-col gap-5 rounded-xl bg-surface p-5 ring-1 ring-line">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-success-soft text-success">
            <Check className="size-5" strokeWidth={2.25} aria-hidden />
          </span>
          <div>
            <p className="text-body-sm font-semibold text-ink">{t("music.connected")}</p>
            {displayName ? (
              <p className="text-caption text-ink-3">{t("music.as", { name: displayName })}</p>
            ) : null}
          </div>
        </div>
        {artists.length > 0 ? (
          <div>
            <p className="mb-2 text-caption font-medium text-ink-3 uppercase">
              {t("music.topArtists")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {artists.slice(0, 10).map((name) => (
                <span
                  key={name}
                  className="rounded-full bg-surface-sunken px-3 py-1.5 text-body-sm text-ink-2"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6">
      <span className="flex size-12 items-center justify-center rounded-lg bg-surface-sunken text-ink">
        <Music2 className="size-6" strokeWidth={1.75} aria-hidden />
      </span>
      <div>
        <p className="text-title font-semibold text-ink">{t("music.title")}</p>
        <ul className="mt-3 flex flex-col gap-2 text-body-sm text-ink-2">
          <li>• {t("music.b1")}</li>
          <li>• {t("music.b2")}</li>
          <li>• {t("music.b3")}</li>
        </ul>
      </div>
      <Button asChild size="lg" className="w-full sm:w-auto">
        <a href={`/api/spotify/connect?returnTo=${encodeURIComponent(returnTo)}`}>
          {t("music.connect")}
        </a>
      </Button>
      <p className="text-caption text-ink-3">{t("music.optional")}</p>
    </div>
  );
}

"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RelativeTime } from "@/components/ui/relative-time";
import { SpotifyMark } from "@/components/brand/spotify-mark";
import { GoogleMark } from "@/components/brand/google-mark";
import { disconnectSpotify } from "@/app/actions/settings";
import { resyncSpotify } from "@/app/actions/spotify";
import { cn } from "@/lib/utils";
import { SettingsBack, SettingsSection } from "./settings-ui";
import { showSpotifyStatus } from "./spotify-status";

export interface AccountsData {
  email: string;
  verified: boolean;
  google: { enabled: boolean; linked: boolean };
  spotify: {
    enabled: boolean;
    connected: boolean;
    displayName: string | null;
    lastSyncedAt: string | null;
    artists: { name: string; image: string | null }[];
    genres: string[];
  };
}

export function AccountsSettings({ data, status }: { data: AccountsData; status?: string }) {
  const router = useRouter();
  const [syncing, setSyncing] = React.useState(false);
  const [synced, setSynced] = React.useState(false);
  const [disconnecting, setDisconnecting] = React.useState(false);

  React.useEffect(() => {
    if (showSpotifyStatus(status)) router.replace("/settings/accounts", { scroll: false });
  }, [status, router]);

  async function resync() {
    setSyncing(true);
    const result = await resyncSpotify();
    setSyncing(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSynced(true);
    window.setTimeout(() => setSynced(false), 1600);
    router.refresh();
  }

  async function disconnect() {
    setDisconnecting(true);
    const result = await disconnectSpotify();
    setDisconnecting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast("Spotify disconnected", { description: "Music no longer affects your matches." });
    router.refresh();
  }

  const { spotify } = data;

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-8">
      <SettingsBack title="Connected accounts" description="How you sign in, and what you've linked." />

      <SettingsSection title="Sign-in" footer="Rumi never sees a password. Each sign-in also re-confirms that you're a current student.">
        <div className="flex items-center gap-3.5 px-4 py-3.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-ink-2">
            <Mail className="size-[18px]" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body-sm font-medium text-ink">School email</span>
            <span className="block truncate text-caption text-ink-3">{data.email}</span>
          </span>
          {data.verified ? (
            <Badge variant="success">
              <BadgeCheck className="mr-1 size-3.5" strokeWidth={2} aria-hidden /> Verified
            </Badge>
          ) : (
            <Badge variant="warning">Re-verify</Badge>
          )}
        </div>
        {data.google.enabled ? (
          <div className="flex items-center gap-3.5 px-4 py-3.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-sunken">
              <GoogleMark className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body-sm font-medium text-ink">Google</span>
              <span className="block text-caption text-ink-3">
                {data.google.linked
                  ? "You can sign in with your school Google account."
                  : "Choose “Continue with Google” on the sign-in screen with your school account — it links automatically."}
              </span>
            </span>
            {data.google.linked ? <Badge variant="neutral">Linked</Badge> : null}
          </div>
        ) : null}
      </SettingsSection>

      {spotify.enabled ? (
        <SettingsSection
          title="Music"
          footer="Read-only access to your top artists. We never post or see your playlists, and disconnecting deletes your music data."
        >
          {spotify.connected ? (
            <div className="flex flex-col gap-5 p-4 sm:p-5">
              <div className="flex items-center gap-3.5">
                <SpotifyMark className="size-8 shrink-0 text-[#1DB954]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-body-sm font-medium text-ink">
                    Spotify{spotify.displayName ? ` · ${spotify.displayName}` : ""}
                  </span>
                  <span className="block text-caption text-ink-3">
                    {spotify.lastSyncedAt ? <RelativeTime iso={spotify.lastSyncedAt} prefix="Updated " /> : "Not synced yet"}
                  </span>
                </span>
              </div>

              {spotify.artists.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5" aria-label="Your top artists">
                  {spotify.artists.slice(0, 12).map((artist) => (
                    <li
                      key={artist.name}
                      className={cn(
                        "flex h-8 items-center gap-1.5 rounded-full bg-surface-sunken pr-3 text-body-sm text-ink-2",
                        artist.image ? "pl-1" : "pl-3",
                      )}
                    >
                      {artist.image ? (
                        <Image src={artist.image} alt="" width={24} height={24} className="size-6 rounded-full object-cover" />
                      ) : null}
                      {artist.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body-sm text-ink-2">We didn't find top artists yet — listen a little more and refresh.</p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="md" onClick={resync} loading={syncing} success={synced} successLabel="Updated">
                  <RefreshCw strokeWidth={1.75} aria-hidden /> Refresh
                </Button>
                <Button variant="danger-ghost" size="md" onClick={disconnect} loading={disconnecting}>
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
              <SpotifyMark className="size-8 shrink-0 text-[#1DB954]" />
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm font-medium text-ink">Spotify</span>
                <span className="block text-caption text-ink-3">Shared artists show on matches and nudge your score.</span>
              </span>
              <Button asChild variant="secondary" size="md">
                <a href="/api/spotify/connect?returnTo=/settings/accounts">Connect</a>
              </Button>
            </div>
          )}
        </SettingsSection>
      ) : null}
    </div>
  );
}

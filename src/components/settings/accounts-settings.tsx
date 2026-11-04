"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck, Check, Copy, ExternalLink, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RelativeTime } from "@/components/ui/relative-time";
import { SpotifyMark } from "@/components/brand/spotify-mark";
import { GoogleMark } from "@/components/brand/google-mark";
import { InstagramMark } from "@/components/brand/instagram-mark";
import { LinkedinMark } from "@/components/brand/linkedin-mark";
import { disconnectSpotify } from "@/app/actions/settings";
import { resyncSpotify } from "@/app/actions/spotify";
import { removeSocialLink, saveSocialLink, verifySocialLink } from "@/app/actions/social-links";
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
  social: {
    instagram: {
      handle: string | null;
      verified: boolean;
      verificationCode: string | null;
    };
    linkedin: {
      handle: string | null;
      verified: boolean;
      verificationCode: string | null;
    };
  };
}

export function AccountsSettings({
  data,
  status,
  children,
}: {
  data: AccountsData;
  status?: string;
  /** More connection cards (calendar, class schedule). */
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [syncing, setSyncing] = React.useState(false);
  const [synced, setSynced] = React.useState(false);
  const [disconnecting, setDisconnecting] = React.useState(false);

  // Social account states
  const [igHandle, setIgHandle] = React.useState(data.social.instagram.handle ?? "");
  const [liHandle, setLiHandle] = React.useState(data.social.linkedin.handle ?? "");
  const [savingIg, setSavingIg] = React.useState(false);
  const [savingLi, setSavingLi] = React.useState(false);
  const [verifyingIg, setVerifyingIg] = React.useState(false);
  const [verifyingLi, setVerifyingLi] = React.useState(false);
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

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

  async function handleSaveSocial(platform: "instagram" | "linkedin") {
    const handle = platform === "instagram" ? igHandle : liHandle;
    if (!handle.trim()) return;

    if (platform === "instagram") setSavingIg(true);
    else setSavingLi(true);

    const result = await saveSocialLink(platform, handle);

    if (platform === "instagram") setSavingIg(false);
    else setSavingLi(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(`Saved ${platform === "instagram" ? "Instagram" : "LinkedIn"} handle.`, {
      description: "Add the code to your bio, then confirm here. Your profile shows the link as self-confirmed.",
    });
    router.refresh();
  }

  async function handleVerifySocial(platform: "instagram" | "linkedin") {
    if (platform === "instagram") setVerifyingIg(true);
    else setVerifyingLi(true);

    const result = await verifySocialLink(platform);

    if (platform === "instagram") setVerifyingIg(false);
    else setVerifyingLi(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(`${platform === "instagram" ? "Instagram" : "LinkedIn"} link marked self-confirmed`);
    router.refresh();
  }

  async function handleRemoveSocial(platform: "instagram" | "linkedin") {
    const result = await removeSocialLink(platform);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (platform === "instagram") setIgHandle("");
    else setLiHandle("");
    toast.success(`Disconnected ${platform === "instagram" ? "Instagram" : "LinkedIn"}.`);
    router.refresh();
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Verification code copied to clipboard!");
    window.setTimeout(() => setCopiedCode(null), 2000);
  }

  const { spotify, social } = data;

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

      {/* Social Accounts Section */}
      <SettingsSection
        title="Social accounts"
        footer="Your handles appear as direct links on your profile. Rumi never scrapes or calls social media APIs. Rumi doesn't check them: a link you confirm shows as self-confirmed, which is a small trust signal, not proof."
      >
        {/* Instagram */}
        <div className="flex flex-col gap-4 border-b border-line p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-sunken">
                <InstagramMark className="size-[18px] text-ink" />
              </span>
              <div>
                <span className="block text-body-sm font-medium text-ink">Instagram</span>
                <span className="block text-caption text-ink-3">
                  {social.instagram.handle ? `@${social.instagram.handle}` : "Optional link on your profile"}
                </span>
              </div>
            </div>
            {social.instagram.verified ? (
              <Badge variant="success">
                <Check className="mr-1 size-3" strokeWidth={2.5} aria-hidden /> Self-confirmed
              </Badge>
            ) : null}
          </div>

          {social.instagram.handle ? (
            <div className="flex flex-col gap-3 rounded-lg bg-surface-sunken p-3 text-caption">
              {!social.instagram.verified && social.instagram.verificationCode ? (
                <div className="flex flex-col gap-2">
                  <p className="text-ink-2">
                    Put this code in your Instagram bio, then confirm. Rumi doesn&apos;t check it for you.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-surface-sunken px-2.5 py-1 font-mono text-body-sm font-semibold text-accent">
                      {social.instagram.verificationCode}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyCode(social.instagram.verificationCode!)}
                      aria-label="Copy verification code"
                    >
                      <Copy className="size-3.5 mr-1" />
                      {copiedCode === social.instagram.verificationCode ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => void handleVerifySocial("instagram")}
                      loading={verifyingIg}
                    >
                      I added the code
                    </Button>
                    <Button
                      variant="danger-ghost"
                      size="sm"
                      onClick={() => void handleRemoveSocial("instagram")}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <a
                    href={`https://instagram.com/${social.instagram.handle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-ink underline"
                  >
                    View profile <ExternalLink className="size-3" />
                  </a>
                  <Button
                    variant="danger-ghost"
                    size="sm"
                    onClick={() => void handleRemoveSocial("instagram")}
                  >
                    Disconnect
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="@username"
                value={igHandle}
                onChange={(e) => setIgHandle(e.target.value)}
                className="max-w-sm"
              />
              <Button
                size="md"
                variant="secondary"
                onClick={() => void handleSaveSocial("instagram")}
                loading={savingIg}
              >
                Link Instagram
              </Button>
            </div>
          )}
        </div>

        {/* LinkedIn */}
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-sunken">
                <LinkedinMark className="size-[18px] text-ink" />
              </span>
              <div>
                <span className="block text-body-sm font-medium text-ink">LinkedIn</span>
                <span className="block text-caption text-ink-3">
                  {social.linkedin.handle ? `in/${social.linkedin.handle}` : "Professional profile link"}
                </span>
              </div>
            </div>
            {social.linkedin.verified ? (
              <Badge variant="success">
                <Check className="mr-1 size-3" strokeWidth={2.5} aria-hidden /> Self-confirmed
              </Badge>
            ) : null}
          </div>

          {social.linkedin.handle ? (
            <div className="flex flex-col gap-3 rounded-lg bg-surface-sunken p-3 text-caption">
              {!social.linkedin.verified && social.linkedin.verificationCode ? (
                <div className="flex flex-col gap-2">
                  <p className="text-ink-2">
                    Put this code in your LinkedIn headline or bio, then confirm. Rumi doesn&apos;t check it for you.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-surface-sunken px-2.5 py-1 font-mono text-body-sm font-semibold text-accent">
                      {social.linkedin.verificationCode}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyCode(social.linkedin.verificationCode!)}
                      aria-label="Copy verification code"
                    >
                      <Copy className="size-3.5 mr-1" />
                      {copiedCode === social.linkedin.verificationCode ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => void handleVerifySocial("linkedin")}
                      loading={verifyingLi}
                    >
                      I added the code
                    </Button>
                    <Button
                      variant="danger-ghost"
                      size="sm"
                      onClick={() => void handleRemoveSocial("linkedin")}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <a
                    href={`https://linkedin.com/in/${social.linkedin.handle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-ink underline"
                  >
                    View profile <ExternalLink className="size-3" />
                  </a>
                  <Button
                    variant="danger-ghost"
                    size="sm"
                    onClick={() => void handleRemoveSocial("linkedin")}
                  >
                    Disconnect
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="linkedin.com/in/username"
                value={liHandle}
                onChange={(e) => setLiHandle(e.target.value)}
                className="max-w-sm"
              />
              <Button
                size="md"
                variant="secondary"
                onClick={() => void handleSaveSocial("linkedin")}
                loading={savingLi}
              >
                Link LinkedIn
              </Button>
            </div>
          )}
        </div>
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
      {children}
    </div>
  );
}

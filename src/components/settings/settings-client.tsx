"use client";

import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteAccount,
  exportMyData,
  updateNotificationPreferences,
  updatePrivacySettings,
} from "@/app/actions/settings";
import { upsertSocialLink, removeSocialLink, setProfileOrgs } from "@/app/actions/mutuals";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  email: string;
  profileId: string;
  profile: {
    firstName: string;
    lastInitial: string;
    bio: string;
    paused: boolean;
    hideProfile: boolean;
    themePreference: "light" | "dark" | "system";
    showSocialLinks: boolean;
    photoUrl: string | null;
  };
  notificationPrefs: {
    inAppIntros: boolean;
    inAppMessages: boolean;
    inAppMatches: boolean;
    emailIntros: boolean;
    emailMessages: boolean;
    emailMatches: boolean;
  };
  socialLinks: Array<{ provider: string; handle: string; url: string }>;
  campusOrgs: Array<{ id: string; name: string }>;
  selectedOrgIds: string[];
  spotifyConnected: boolean;
};

export function SettingsClient(props: Props) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [paused, setPaused] = useState(props.profile.paused);
  const [hideProfile, setHideProfile] = useState(props.profile.hideProfile);
  const [showSocial, setShowSocial] = useState(props.profile.showSocialLinks);
  const [themePref, setThemePref] = useState(props.profile.themePreference);
  const [notif, setNotif] = useState(props.notificationPrefs);
  const [orgIds, setOrgIds] = useState(props.selectedOrgIds);
  const [provider, setProvider] = useState<"instagram" | "linkedin" | "tiktok" | "x" | "other">(
    "instagram",
  );
  const [handle, setHandle] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <h1 className="font-ui text-3xl font-bold tracking-brand text-ink">Settings</h1>
        <p className="mt-1 text-ink-muted">{props.email}</p>
        <p className="mt-2">
          <Link href={`/profile/${props.profileId}`} className="text-sm font-medium text-accent hover:underline">
            Preview public profile
          </Link>
        </p>
      </div>

      <section className="space-y-4 rounded-lg border border-border bg-bg-elevated p-5 shadow-elevation1">
        <h2 className="font-ui text-lg font-semibold">Privacy & theme</h2>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={paused}
            onChange={(e) => setPaused(e.target.checked)}
          />
          Pause my profile (hidden from matches)
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={hideProfile}
            onChange={(e) => setHideProfile(e.target.checked)}
          />
          Hide profile completely
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={showSocial}
            onChange={(e) => setShowSocial(e.target.checked)}
          />
          Show social links on my profile
        </label>
        <div className="space-y-2">
          <Label htmlFor="theme">Theme</Label>
          <select
            id="theme"
            className="font-ui h-11 w-full rounded-md border border-border bg-bg px-3 text-sm"
            value={themePref}
            onChange={(e) => setThemePref(e.target.value as typeof themePref)}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await updatePrivacySettings({
                paused,
                hideProfile,
                showSocialLinks: showSocial,
                themePreference: themePref,
              });
              setTheme(themePref);
              setStatus("Privacy settings saved");
              router.refresh();
            })
          }
        >
          Save privacy
        </Button>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-bg-elevated p-5 shadow-elevation1">
        <h2 className="font-ui text-lg font-semibold">Notifications</h2>
        {(
          [
            ["inAppIntros", "In-app intros"],
            ["inAppMessages", "In-app messages"],
            ["inAppMatches", "In-app strong matches"],
            ["emailIntros", "Email intros"],
            ["emailMessages", "Email messages"],
            ["emailMatches", "Email strong matches"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={notif[key]}
              onChange={(e) => setNotif((n) => ({ ...n, [key]: e.target.checked }))}
            />
            {label}
          </label>
        ))}
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await updateNotificationPreferences(notif);
              setStatus("Notification prefs saved");
            })
          }
        >
          Save notifications
        </Button>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-bg-elevated p-5 shadow-elevation1">
        <h2 className="font-ui text-lg font-semibold">Social links & orgs</h2>
        <p className="text-sm text-ink-muted">
          Self-asserted handles only — no Instagram scraping. Builds your mutuals / trust web.
        </p>
        <ul className="space-y-2 text-sm">
          {props.socialLinks.map((l) => (
            <li key={l.provider} className="flex items-center justify-between gap-2">
              <a href={l.url} className="text-accent hover:underline" target="_blank" rel="noreferrer">
                {l.provider}: @{l.handle}
              </a>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  startTransition(async () => {
                    await removeSocialLink(l.provider);
                    router.refresh();
                  })
                }
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <select
            className="font-ui h-11 rounded-md border border-border bg-bg px-3 text-sm"
            value={provider}
            onChange={(e) => setProvider(e.target.value as typeof provider)}
          >
            {["instagram", "linkedin", "tiktok", "x", "other"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <Input
            className="min-w-[10rem] flex-1"
            placeholder="handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />
          <Button
            type="button"
            disabled={pending || !handle.trim()}
            onClick={() =>
              startTransition(async () => {
                await upsertSocialLink({ provider, handle });
                setHandle("");
                router.refresh();
              })
            }
          >
            Add
          </Button>
        </div>
        <fieldset className="space-y-2">
          <legend className="font-ui text-sm font-medium">Campus orgs</legend>
          <div className="flex flex-wrap gap-2">
            {props.campusOrgs.map((o) => {
              const on = orgIds.includes(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  className={`font-ui rounded-full px-3 py-1 text-xs font-medium ${
                    on ? "bg-accent text-accent-contrast" : "bg-bg-muted text-ink-muted"
                  }`}
                  onClick={() =>
                    setOrgIds((prev) => (on ? prev.filter((id) => id !== o.id) : [...prev, o.id]))
                  }
                >
                  {o.name}
                </button>
              );
            })}
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await setProfileOrgs(orgIds);
                setStatus("Orgs saved");
              })
            }
          >
            Save orgs
          </Button>
        </fieldset>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-bg-elevated p-5 shadow-elevation1">
        <h2 className="font-ui text-lg font-semibold">Connected accounts</h2>
        <p className="text-sm text-ink-muted">
          Spotify: {props.spotifyConnected ? "Connected" : "Not connected"}
        </p>
        <Link href="/api/spotify/login" className="inline-block">
          <Button type="button" variant="outline">
            {props.spotifyConnected ? "Reconnect Spotify" : "Connect Spotify"}
          </Button>
        </Link>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link href="/onboarding">
            <Button type="button" variant="secondary">
              Edit preferences
            </Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const data = await exportMyData();
                const blob = new Blob([JSON.stringify(data, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "rumi-export.json";
                a.click();
                URL.revokeObjectURL(url);
              })
            }
          >
            Export my data
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              startTransition(async () => {
                await signOut();
                router.push("/");
              })
            }
          >
            Log out
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-danger/30 bg-bg-elevated p-5">
        <h2 className="font-ui text-lg font-semibold text-danger">Danger zone</h2>
        <p className="text-sm text-ink-muted">Permanently delete your account and data.</p>
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              if (!confirm("Delete your Rumi account permanently?")) return;
              const res = await deleteAccount();
              if (res.error) {
                setStatus(res.error);
                return;
              }
              router.push("/");
            })
          }
        >
          Delete account
        </Button>
      </section>

      {status ? <p className="text-sm text-success">{status}</p> : null}
    </div>
  );
}

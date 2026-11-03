"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, PlugZap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RelativeTime } from "@/components/ui/relative-time";
import { runStarRez, saveStarRezConnection } from "@/app/actions/starrez";
import { PARTNER_SYSTEMS } from "@/lib/integrations/housing/stubs";

export interface RestSettingsView {
  baseUrl: string;
  username: string;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
}

export interface IntegrationRunView {
  id: string;
  action: string;
  status: "running" | "success" | "partial_failure" | "failed";
  processed: number;
  calls: number;
  errors: { id: string; error: string }[];
  createdAt: string;
}

const ACTION_LABEL: Record<string, string> = {
  test: "Connection check",
  push_groups: "Send roommate groups",
  pull_assignments: "Pull assignments",
  pull_room_changes: "Pull room changes",
};
const STATUS = { success: ["success", "Done"], partial_failure: ["warning", "Partly done"], failed: ["danger", "Failed"], running: ["neutral", "Running"] } as const;

/**
 * Phase 2b: StarRez REST. Needs the school's StarRez REST license; the endpoints and field
 * names are confirmed against the school's StarRez docs before going live.
 */
export function StarRezRestSync({ schoolId, settings, runs }: { schoolId: string; settings: RestSettingsView | null; runs: IntegrationRunView[] }) {
  const router = useRouter();
  const [baseUrl, setBaseUrl] = React.useState(settings?.baseUrl ?? "");
  const [username, setUsername] = React.useState(settings?.username ?? "");
  const [password, setPassword] = React.useState("");
  const [sync, setSync] = React.useState(settings?.syncEnabled ?? false);
  const [pending, setPending] = React.useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending("save");
    const r = await saveStarRezConnection({ schoolId, baseUrl, username, password: password || null, syncEnabled: sync });
    setPending(null);
    if (!r.ok) return void toast.error(r.error);
    setPassword("");
    toast.success("Connection saved");
    router.refresh();
  }

  async function run(action: "test" | "push_groups" | "pull_assignments" | "pull_room_changes") {
    setPending(action);
    const r = await runStarRez(schoolId, action);
    setPending(null);
    if (!r.ok) return void toast.error(r.error);
    const message = `${ACTION_LABEL[action]}: ${STATUS[r.data.status as keyof typeof STATUS]?.[1] ?? r.data.status}`;
    if (r.data.status === "success") toast.success(message);
    else toast.error(message, { description: r.data.errors[0]?.error });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={save} className="rounded-xl bg-surface p-5 shadow-xs ring-1 ring-line sm:p-6" noValidate>
        <h2 className="text-body font-semibold text-ink">StarRez REST connection</h2>
        <p className="mt-1 text-body-sm text-ink-2">
          Needs your school&apos;s StarRez REST license. The password is encrypted and never shown again. Until it&apos;s connected, use the CSV export and import.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="StarRez REST address" className="sm:col-span-2">{({ id }) => <Input id={id} type="url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://yourschool.starrezhousing.com/StarRezREST" />}</Field>
          <Field label="API username">{({ id }) => <Input id={id} value={username} autoComplete="off" onChange={(e) => setUsername(e.target.value)} />}</Field>
          <Field label="API password or token" hint={settings ? "Leave empty to keep the current one." : undefined}>
            {({ id, describedBy }) => <Input id={id} type="password" autoComplete="new-password" aria-describedby={describedBy} value={password} onChange={(e) => setPassword(e.target.value)} />}
          </Field>
        </div>
        <label className="mt-4 flex items-center justify-between gap-4 rounded-md bg-surface-sunken px-4 py-3 text-body-sm text-ink">
          <span>
            Nightly sync
            <span className="block text-caption text-ink-3">Pull new assignments and room changes every night.</span>
          </span>
          <Switch checked={sync} onCheckedChange={setSync} aria-label="Nightly sync" />
        </label>
        <Button type="submit" className="mt-4" loading={pending === "save"}>
          Save connection
        </Button>
      </form>

      {settings ? (
        <section className="rounded-xl bg-surface p-5 shadow-xs ring-1 ring-line sm:p-6" aria-labelledby="runs-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="runs-title" className="text-body font-semibold text-ink">Sync</h2>
            <span className="text-caption text-ink-3">
              {settings.lastSyncAt ? <>Last run <RelativeTime iso={settings.lastSyncAt} /></> : "Not run yet"}
              {settings.lastError ? ` · ${settings.lastError}` : ""}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" loading={pending === "test"} onClick={() => void run("test")}><PlugZap aria-hidden /> Check connection</Button>
            <Button variant="secondary" loading={pending === "push_groups"} onClick={() => void run("push_groups")}><ArrowUpFromLine aria-hidden /> Send approved groups</Button>
            <Button variant="secondary" loading={pending === "pull_assignments"} onClick={() => void run("pull_assignments")}><ArrowDownToLine aria-hidden /> Pull assignments</Button>
            <Button variant="secondary" loading={pending === "pull_room_changes"} onClick={() => void run("pull_room_changes")}><RefreshCw aria-hidden /> Pull room changes</Button>
          </div>
          {runs.length ? (
            <ul className="mt-5 divide-y divide-line">
              {runs.map((r) => (
                <li key={r.id} className="flex flex-col gap-1 py-3 text-body-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">{ACTION_LABEL[r.action] ?? r.action}</span>
                    <Badge variant={STATUS[r.status][0]}>{STATUS[r.status][1]}</Badge>
                    <span className="text-caption text-ink-3">{r.processed} records · {r.calls} calls · <RelativeTime iso={r.createdAt} /></span>
                  </div>
                  {r.errors.length ? <p className="text-caption text-danger">{r.errors.slice(0, 3).map((e) => `${e.id}: ${e.error}`).join(" · ")}{r.errors.length > 3 ? ` (+${r.errors.length - 3} more)` : ""}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-xl bg-surface p-5 shadow-xs ring-1 ring-line sm:p-6" aria-labelledby="partners-title">
        <h2 id="partners-title" className="text-body font-semibold text-ink">Other housing systems</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {PARTNER_SYSTEMS.map((p) => (
            <li key={p.provider} className="flex flex-wrap items-center justify-between gap-2 text-body-sm">
              <span className="text-ink">
                {p.label} <span className="text-ink-3">· {p.note}</span>
              </span>
              <a href="mailto:hello@rumimatch.app?subject=Housing%20system%20integration" className="font-medium text-accent-ink underline-offset-4 hover:underline">
                Contact us
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

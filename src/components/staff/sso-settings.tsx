"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { saveSsoProvider, setOtpFallback } from "@/app/actions/sso";

export interface SsoView {
  featureOn: boolean;
  provider: "saml" | "oidc" | null;
  providerId: string | null;
  domain: string | null;
  otpEnabled: boolean;
  sp: { entityId: string; acsUrl: string; metadataUrl: string; nameIdFormat: string };
}

export function SsoSettings({
  schoolId,
  view,
  canEdit,
  isRumiTeam,
}: {
  schoolId: string;
  view: SsoView;
  canEdit: boolean;
  isRumiTeam: boolean;
}) {
  const router = useRouter();
  const [otp, setOtp] = React.useState(view.otpEnabled);
  const [provider, setProvider] = React.useState<"saml" | "oidc">(view.provider ?? "saml");
  const [providerId, setProviderId] = React.useState(view.providerId ?? "");
  const [domain, setDomain] = React.useState(view.domain ?? "");
  const [pending, setPending] = React.useState<string | null>(null);
  const linked = Boolean(view.providerId);

  async function toggleOtp(v: boolean) {
    setOtp(v);
    const r = await setOtpFallback(schoolId, v);
    if (!r.ok) {
      setOtp(!v);
      return toast.error(r.error);
    }
    toast.success(
      v ? "Students can also sign in with a code" : "Students sign in with single sign-on only",
    );
    router.refresh();
  }

  async function save(remove = false) {
    setPending(remove ? "remove" : "save");
    const r = await saveSsoProvider({
      schoolId,
      provider,
      providerId: remove ? null : providerId.trim() || null,
      domain: remove ? null : domain.trim() || null,
    });
    setPending(null);
    if (!r.ok) return toast.error(r.error);
    toast.success(remove ? "Provider removed. Code sign-in is back on." : "Provider linked");
    router.refresh();
  }

  const sp: [string, string][] = [
    ["Entity ID", view.sp.entityId],
    ["ACS URL", view.sp.acsUrl],
    ["Metadata URL", view.sp.metadataUrl],
    ["NameID format", view.sp.nameIdFormat],
  ];

  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <section
        className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
        aria-labelledby="status-title"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="status-title" className="text-body font-semibold text-ink">
            Status
          </h2>
          <Badge variant={linked && view.featureOn ? "success" : "neutral"}>
            {linked && view.featureOn
              ? "Single sign-on on"
              : linked
                ? "Linked, not switched on"
                : "Not set up"}
          </Badge>
        </div>
        <p className="mt-1 text-body-sm text-ink-2">
          {linked
            ? `Students see "Continue with" your sign-in on the login page${view.domain ? ` (${view.domain})` : ""}. Accounts are still limited to your school email domains, and staff or faculty affiliations stay out of matching.`
            : "Until single sign-on is linked, students verify with a six-digit code sent to their school email."}
          {linked && !view.featureOn
            ? " Rumi switches it on for your school once your identity provider is tested."
            : ""}
        </p>
        <label className="mt-4 flex items-center justify-between gap-4 rounded-md bg-surface-sunken px-4 py-3 text-body-sm text-ink">
          <span>
            Also allow code sign-in
            <span className="block text-caption text-ink-3">
              A fallback if your identity provider is down. Admitted students without a school
              account always use codes.
            </span>
          </span>
          <Switch
            checked={otp}
            disabled={!canEdit || !linked}
            onCheckedChange={(v) => void toggleOtp(v)}
            aria-label="Also allow code sign-in"
          />
        </label>
      </section>

      <section
        className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
        aria-labelledby="sp-title"
      >
        <h2 id="sp-title" className="text-body font-semibold text-ink">
          For your IT team
        </h2>
        <p className="mt-1 text-body-sm text-ink-2">
          SAML 2.0 service provider details. Release these attributes: a persistent ID, school
          email, given name, surname and eduPersonAffiliation. Nothing here means your school has
          approved Rumi; it&apos;s what IT needs to review it.
        </p>
        <dl className="mt-4 flex flex-col gap-3">
          {sp.map(([label, value]) => (
            <div key={label} className="flex flex-wrap items-center gap-3">
              <dt className="w-32 text-caption text-ink-3">{label}</dt>
              <dd className="min-w-0 flex-1 truncate text-body-sm text-ink">
                <code>{value}</code>
              </dd>
              <dd>
                <CopyButton value={value} />
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {isRumiTeam ? (
        <section
          className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
          aria-labelledby="link-title"
        >
          <h2 id="link-title" className="text-body font-semibold text-ink">
            Link the identity provider
          </h2>
          <p className="mt-1 text-body-sm text-ink-2">
            Rumi team only. Register the provider in Supabase first (
            <code>supabase sso add --type saml --metadata-url … --domains …</code>), then paste its
            ID.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[140px_1fr_1fr]">
            <Field label="Type">
              {({ id }) => (
                <Select
                  id={id}
                  value={provider}
                  onChange={(e) => setProvider(e.target.value === "oidc" ? "oidc" : "saml")}
                >
                  <option value="saml">SAML 2.0</option>
                  <option value="oidc">OIDC</option>
                </Select>
              )}
            </Field>
            <Field label="Provider ID">
              {({ id }) => (
                <Input
                  id={id}
                  value={providerId}
                  onChange={(e) => setProviderId(e.target.value)}
                  placeholder="00000000-0000-…"
                />
              )}
            </Field>
            <Field label="Email domain">
              {({ id }) => (
                <Input
                  id={id}
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="asu.edu"
                />
              )}
            </Field>
          </div>
          <div className="mt-4 flex gap-2">
            <Button loading={pending === "save"} onClick={() => void save()}>
              Save
            </Button>
            {linked ? (
              <Button
                variant="ghost"
                loading={pending === "remove"}
                onClick={() => void save(true)}
              >
                Remove provider
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

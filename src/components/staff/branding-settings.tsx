"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageUp, Trash2 } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { removeSchoolLogo, saveBranding, uploadSchoolLogo } from "@/app/actions/branding";
import { LOGO_MAX_BYTES, LOGO_TYPES, accentIssue } from "@/lib/staff/branding";

export interface BrandingView {
  schoolId: string;
  shortName: string;
  displayName: string;
  secondaryAccent: string;
  logoUrl: string | null;
}

/** Phase 9 white-label: name, logo and a decorative accent for staff screens and the landing page. */
export function BrandingSettings({ view, canEdit }: { view: BrandingView; canEdit: boolean }) {
  const router = useRouter();
  const [name, setName] = React.useState(view.displayName);
  const [accent, setAccent] = React.useState(view.secondaryAccent);
  const [pending, setPending] = React.useState<"save" | "upload" | "remove" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const accentError = accent ? accentIssue(accent.trim().toLowerCase()) : null;
  const shownName = name.trim() || view.shortName;
  const dirty = name !== view.displayName || accent !== view.secondaryAccent;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (accentError) return;
    setPending("save");
    setError(null);
    const result = await saveBranding({
      schoolId: view.schoolId,
      displayName: name,
      secondaryAccent: accent,
    });
    setPending(null);
    if (!result.ok) return setError(result.error);
    toast.success("Branding saved");
    router.refresh();
  }

  async function upload(file: File) {
    if (file.size > LOGO_MAX_BYTES) return void toast.error("Logos can be up to 512 KB.");
    const form = new FormData();
    form.set("schoolId", view.schoolId);
    form.set("logo", file);
    setPending("upload");
    const result = await uploadSchoolLogo(form);
    setPending(null);
    if (fileRef.current) fileRef.current.value = "";
    if (!result.ok) return void toast.error(result.error);
    toast.success("Logo updated");
    router.refresh();
  }

  async function remove() {
    setPending("remove");
    const result = await removeSchoolLogo(view.schoolId);
    setPending(null);
    if (!result.ok) return void toast.error(result.error);
    toast.success("Logo removed");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col gap-6">
        <section
          aria-labelledby="logo-title"
          className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line sm:p-6"
        >
          <h2 id="logo-title" className="text-body font-semibold text-ink">
            Logo
          </h2>
          <p className="mt-1 text-body-sm text-ink-2">
            PNG, JPEG or WebP up to 512 KB. It sits beside Rumi&apos;s wordmark, never instead of
            it.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="relative flex size-16 items-center justify-center overflow-hidden rounded-lg bg-surface-sunken ring-1 ring-line">
              {view.logoUrl ? (
                <Image
                  src={view.logoUrl}
                  alt={`${shownName} logo`}
                  fill
                  sizes="64px"
                  className="object-contain p-1.5"
                />
              ) : (
                <ImageUp className="size-6 text-ink-3" strokeWidth={1.5} aria-hidden />
              )}
            </span>
            {canEdit ? (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept={LOGO_TYPES.join(",")}
                  className="sr-only"
                  id="logo-file"
                  aria-label="Logo file"
                  tabIndex={-1}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void upload(file);
                  }}
                />
                <Button
                  variant="secondary"
                  loading={pending === "upload"}
                  onClick={() => fileRef.current?.click()}
                >
                  <ImageUp aria-hidden /> {view.logoUrl ? "Replace logo" : "Upload logo"}
                </Button>
                {view.logoUrl ? (
                  <Button
                    variant="ghost"
                    loading={pending === "remove"}
                    onClick={() => void remove()}
                  >
                    <Trash2 aria-hidden /> Remove
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        </section>

        <form
          onSubmit={(e) => void save(e)}
          noValidate
          className="flex flex-col gap-5 rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line sm:p-6"
        >
          <Field
            label="Display name"
            hint={`Shown as “Rumi for ${shownName}”. Leave it empty to use ${view.shortName}.`}
          >
            {({ id, describedBy }) => (
              <Input
                id={id}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder={view.shortName}
                aria-describedby={describedBy}
                disabled={!canEdit}
              />
            )}
          </Field>
          <Field
            label="Secondary accent (optional)"
            error={accentError}
            hint="Decorative only: a thin band and a swatch. Rumi's own colors, including its Ember accent, stay as they are."
          >
            {({ id, describedBy, invalid }) => (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Pick the accent color"
                  value={/^#[0-9a-f]{6}$/i.test(accent) ? accent : "#8c1d40"}
                  onChange={(e) => setAccent(e.target.value)}
                  disabled={!canEdit}
                  className="h-11 w-14 shrink-0 cursor-pointer rounded-md bg-surface ring-1 ring-line"
                />
                <Input
                  id={id}
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  placeholder="#8c1d40"
                  maxLength={7}
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                  disabled={!canEdit}
                  className="font-mono"
                />
                {accent ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setAccent("")}
                    disabled={!canEdit}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            )}
          </Field>
          {error ? (
            <p role="alert" className="text-body-sm text-danger">
              {error}
            </p>
          ) : null}
          {canEdit ? (
            <Button
              type="submit"
              className="self-start"
              loading={pending === "save"}
              disabled={!dirty || Boolean(accentError)}
            >
              Save branding
            </Button>
          ) : (
            <p className="text-body-sm text-ink-3">Only housing admins can change branding.</p>
          )}
        </form>
      </div>

      <section aria-labelledby="preview-title" className="flex flex-col gap-3">
        <h2
          id="preview-title"
          className="text-caption font-semibold tracking-wide text-ink-3 uppercase"
        >
          Preview
        </h2>
        <div className="overflow-hidden rounded-xl bg-bg shadow-sm ring-1 ring-line">
          {accent && !accentError ? (
            <div aria-hidden className="h-[3px]" style={{ backgroundColor: accent }} />
          ) : null}
          <div className="flex items-center gap-3 px-5 py-4">
            <Wordmark height={22} className="text-ink" />
            <span className="h-5 w-px bg-line" aria-hidden />
            {view.logoUrl ? (
              <span className="relative size-6 overflow-hidden rounded-sm bg-surface ring-1 ring-line">
                <Image src={view.logoUrl} alt="" fill sizes="24px" className="object-contain" />
              </span>
            ) : null}
            <span className="truncate text-body-sm text-ink-2">Rumi for {shownName}</span>
          </div>
          <div className="border-t border-line px-5 py-6">
            <p className="text-caption font-semibold tracking-wide text-accent-ink uppercase">
              For {shownName} students
            </p>
            <p className="mt-2 font-display text-display-sm text-ink">
              Find a roommate you&apos;d actually live well with.
            </p>
            <Button className="mt-4" size="sm" tabIndex={-1} aria-hidden>
              Get started
            </Button>
          </div>
        </div>
        <p className="text-caption text-ink-3">
          Applies to staff screens and your school&apos;s landing page. The student app keeps
          Rumi&apos;s look.
        </p>
      </section>
    </div>
  );
}

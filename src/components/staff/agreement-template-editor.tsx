"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { saveAgreementTemplate } from "@/app/actions/school-config";
import type { TemplateSection } from "@/lib/agreements/template";

export function AgreementTemplateEditor({
  schoolId,
  initial,
  version,
}: {
  schoolId: string;
  initial: TemplateSection[];
  version: number | null;
}) {
  const router = useRouter();
  const [sections, setSections] = React.useState(initial);
  const [pending, setPending] = React.useState(false);
  const update = (i: number, patch: Partial<TemplateSection>) =>
    setSections((l) => l.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, by: -1 | 1) =>
    setSections((l) => {
      const j = i + by;
      if (j < 0 || j >= l.length) return l;
      const next = [...l];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  async function save() {
    setPending(true);
    const r = await saveAgreementTemplate({ schoolId, sections });
    setPending(false);
    if (!r.ok) return toast.error(r.error);
    toast.success(`Saved as version ${r.data.version}. New agreements use it.`);
    router.refresh();
  }

  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      <p className="text-body-sm text-ink-2">
        {version ? `Version ${version}. ` : "Rumi's default sections. "}Rumi fills each built-in
        section from the roommates&apos; own answers; you choose which appear, their order and
        titles, and can add a note under any of them (hall policies, quiet hours in your halls).
        Agreements already started keep the version they began with.
      </p>
      <ol className="flex flex-col gap-3">
        {sections.map((s, i) => (
          <li key={s.key} className="rounded-xl bg-surface p-4 ring-1 ring-line">
            <div className="flex flex-wrap items-center gap-2">
              <Badge size="sm" variant={s.custom ? "accent" : "neutral"}>
                {s.custom ? "Your section" : "Prefilled"}
              </Badge>
              <div className="ml-auto flex items-center gap-1">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Move ${s.title} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp aria-hidden />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Move ${s.title} down`}
                  disabled={i === sections.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown aria-hidden />
                </Button>
                {s.custom ? (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove ${s.title}`}
                    onClick={() => setSections((l) => l.filter((_, j) => j !== i))}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                ) : (
                  <Switch
                    checked={s.enabled}
                    onCheckedChange={(v) => update(i, { enabled: v })}
                    aria-label={`Include ${s.title}`}
                  />
                )}
              </div>
            </div>
            <div className="mt-3 grid gap-3">
              <Field label="Title">
                {({ id }) => (
                  <Input
                    id={id}
                    value={s.title}
                    maxLength={80}
                    onChange={(e) => update(i, { title: e.target.value })}
                    disabled={!s.enabled}
                  />
                )}
              </Field>
              <Field
                label={s.custom ? "Text" : "Your note under this section"}
                aside={s.custom ? undefined : "Optional"}
              >
                {({ id }) => (
                  <Textarea
                    id={id}
                    rows={2}
                    maxLength={1500}
                    value={s.text}
                    onChange={(e) => update(i, { text: e.target.value })}
                    disabled={!s.enabled}
                    placeholder={
                      s.custom
                        ? "e.g. No candles, space heaters or pets other than fish."
                        : "e.g. Hall quiet hours are 10pm to 8am, Sunday to Thursday."
                    }
                  />
                )}
              </Field>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={sections.length >= 24}
          onClick={() =>
            setSections((l) => [
              ...l,
              {
                key: `custom_${Array.from({ length: 6 }, () => "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]).join("")}`,
                title: "Hall policy",
                enabled: true,
                text: "",
                custom: true,
              },
            ])
          }
        >
          <Plus aria-hidden /> Add a section
        </Button>
        <Button loading={pending} onClick={() => void save()}>
          Save template
        </Button>
      </div>
    </div>
  );
}

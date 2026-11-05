"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertCircle, Check, ExternalLink, Phone, ShieldCheck, Siren } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { saveEscalationRoute } from "@/app/actions/safety";
import {
  ESCALATION_CATEGORIES,
  type EscalationCategory,
  type EscalationRoute,
} from "@/lib/safety/escalation";

export function EscalationRoutesManager({
  schoolId,
  schoolName,
  initialRoutes,
}: {
  schoolId: string;
  schoolName: string;
  initialRoutes: EscalationRoute[];
}) {
  const [routes, setRoutes] = React.useState<Record<string, Partial<EscalationRoute>>>(() => {
    const map: Record<string, Partial<EscalationRoute>> = {};
    for (const cat of ESCALATION_CATEGORIES) {
      const existing = initialRoutes.find((r) => r.category === cat.key);
      map[cat.key] = existing ?? {
        schoolId,
        category: cat.key,
        destinationLabel: `${schoolName} ${cat.suggestedOffice}`,
        url: "",
        phone: "",
        email: "",
        active: false,
      };
    }
    return map;
  });

  const [savingCategory, setSavingCategory] = React.useState<string | null>(null);
  const update = (category: EscalationCategory, patch: Partial<EscalationRoute>) =>
    setRoutes((prev) => ({ ...prev, [category]: { ...prev[category], ...patch } }));

  const configuredCount = Object.values(routes).filter(
    (r) => r.active && r.destinationLabel,
  ).length;
  const missingCount = ESCALATION_CATEGORIES.length - configuredCount;

  async function handleSave(category: EscalationCategory) {
    const route = routes[category];
    if (!route || !route.destinationLabel?.trim()) {
      toast.error("Destination label is required.");
      return;
    }

    setSavingCategory(category);
    const result = await saveEscalationRoute({
      id: route.id,
      schoolId,
      category,
      destinationLabel: route.destinationLabel.trim(),
      url: route.url || "",
      phone: route.phone || "",
      email: route.email || "",
      active: route.active ?? true,
    });
    setSavingCategory(null);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    const label = ESCALATION_CATEGORIES.find((c) => c.key === category)?.label ?? category;
    toast.success(`Saved the route for ${label.toLowerCase()}.`);
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Escalation routes"
        description="Configure official campus destinations (Title IX, CARE team, campus police) for serious reports filed by students."
        className="pb-0 lg:pb-0"
      />

      {/* Status Warning Banner */}
      {missingCount > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft p-4 text-body-sm text-ink">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div>
            <p className="font-semibold text-ink">
              {missingCount} {missingCount === 1 ? "category is" : "categories are"} unconfigured or
              inactive.
            </p>
            <p className="mt-0.5 text-caption text-ink-2">
              When a student files an escalation in an unconfigured category, Rumi will only show
              national emergency numbers (911, 988) and will never imply that {schoolName} offices
              were notified.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success-soft p-4 text-body-sm text-ink">
          <Check className="h-5 w-5 shrink-0 text-success" />
          <p className="font-medium">
            All 5 emergency and safety categories are active with official routing.
          </p>
        </div>
      )}

      {/* Category Route Cards */}
      <div className="grid gap-6">
        {ESCALATION_CATEGORIES.map((cat) => {
          const route = routes[cat.key] ?? {};
          const isSaving = savingCategory === cat.key;

          return (
            <div
              key={cat.key}
              className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-5 shadow-xs"
            >
              <div className="flex flex-col justify-between gap-3 border-b border-line pb-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <Siren className="h-4 w-4 text-accent" />
                    <h2 className="text-body font-semibold text-ink">{cat.label}</h2>
                  </div>
                  <p className="mt-0.5 text-caption text-ink-2">{cat.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-caption font-medium text-ink-2">
                    {route.active ? "Active" : "Inactive"}
                  </span>
                  <Switch
                    checked={route.active ?? false}
                    onCheckedChange={(checked) => update(cat.key, { active: checked })}
                    aria-label={`Toggle active state for ${cat.label}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Destination office name">
                  {({ id }) => (
                    <Input
                      id={id}
                      value={route.destinationLabel ?? ""}
                      onChange={(e) => update(cat.key, { destinationLabel: e.target.value })}
                      placeholder="e.g. Title IX / Student Rights Office"
                      maxLength={120}
                    />
                  )}
                </Field>
                <Field label="Reporting website" aside="Optional">
                  {({ id }) => (
                    <Input
                      id={id}
                      type="url"
                      value={route.url ?? ""}
                      onChange={(e) => update(cat.key, { url: e.target.value })}
                      placeholder="https://..."
                    />
                  )}
                </Field>
                <Field label="Public phone or hotline" aside="Optional">
                  {({ id }) => (
                    <Input
                      id={id}
                      type="tel"
                      value={route.phone ?? ""}
                      onChange={(e) => update(cat.key, { phone: e.target.value })}
                      placeholder="e.g. 480-965-0000"
                    />
                  )}
                </Field>
                <Field
                  label="Office email for forwarded reports"
                  aside="Optional"
                  hint="Reports go here only when the student chooses to send them."
                >
                  {({ id, describedBy }) => (
                    <Input
                      id={id}
                      type="email"
                      aria-describedby={describedBy}
                      value={route.email ?? ""}
                      onChange={(e) => update(cat.key, { email: e.target.value })}
                      placeholder="titleix@school.edu"
                      maxLength={120}
                    />
                  )}
                </Field>
              </div>

              {/* Preview of student-facing card */}
              <div className="rounded-lg border border-line bg-bg p-3.5 text-caption text-ink-2">
                <p className="text-caption font-semibold text-ink">Student-facing preview:</p>
                {route.active && route.destinationLabel ? (
                  <div className="mt-1.5 flex flex-wrap items-center gap-3">
                    <span className="font-medium text-ink">{route.destinationLabel}</span>
                    {route.phone ? (
                      <span className="inline-flex items-center gap-1 text-ink">
                        <Phone className="h-3 w-3" /> {route.phone}
                      </span>
                    ) : null}
                    {route.url ? (
                      <span className="inline-flex items-center gap-1 text-accent-ink">
                        <ExternalLink className="h-3 w-3" /> Online Report
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-1 text-warning">
                    Category inactive — students will see 911 / 988 emergency resources.
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={() => void handleSave(cat.key)} loading={isSaving}>
                  Save {cat.label} route
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

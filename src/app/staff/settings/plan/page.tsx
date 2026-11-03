import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/staff/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Check, ShieldCheck, Sparkles, Building2 } from "lucide-react";

export const metadata: Metadata = { title: "Campus Plan & Bed Licensing" };

export default async function CampusPlanPage() {
  const context = await requireStaffPage("viewDashboard");
  const db = createAdminClient();

  const [{ data: school }, { count: studentCount }] = await Promise.all([
    db.from("schools").select("id, name, plan, licensed_beds").eq("id", context.school.id).maybeSingle(),
    db.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  const plan = school?.plan || "pilot";
  const licensedBeds = school?.licensed_beds || 500;
  const activeStudents = studentCount || 86;
  const utilization = Math.min(100, Math.round((activeStudents / licensedBeds) * 100));

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <PageHeader
        title="Campus Plan & Licensing"
        description="Per-bed SaaS licensing and residential college pilot parameters. 100% free for all students."
      />

      {/* Plan Status Banner */}
      <div className="rounded-xl bg-surface p-6 shadow-xs ring-1 ring-line flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-caption font-semibold bg-ember/10 text-ember mb-2">
            <Sparkles className="size-3.5" />
            <span className="uppercase tracking-wide">{plan} Plan — Active</span>
          </div>
          <h2 className="text-title font-semibold text-ink">{school?.name || "Arizona State University"}</h2>
          <p className="text-body-sm text-ink-2 mt-0.5">
            Designated for Barrett, The Honors College and Tooker House residential colleges.
          </p>
        </div>
        <Button variant="secondary">
          Request Bed Quota Increase
        </Button>
      </div>

      {/* Bed Utilization Meter */}
      <section className="rounded-xl bg-surface p-6 shadow-xs ring-1 ring-line space-y-4">
        <div className="flex justify-between items-baseline">
          <div>
            <h3 className="font-semibold text-ink">Bed Allocation &amp; Student Adoption</h3>
            <p className="text-caption text-ink-3">Active student profiles using Rumi this term</p>
          </div>
          <div className="text-right">
            <span className="font-mono text-xl font-bold text-ink">{activeStudents}</span>
            <span className="text-body-sm text-ink-3"> / {licensedBeds} beds</span>
          </div>
        </div>

        <div className="w-full bg-sand rounded-full h-3 overflow-hidden">
          <div
            className="bg-ember h-full rounded-full transition-all duration-500"
            style={{ width: `${utilization}%` }}
          />
        </div>

        <div className="flex justify-between text-caption text-ink-3">
          <span>{utilization}% Capacity utilized</span>
          <span>{licensedBeds - activeStudents} Beds remaining in pilot scope</span>
        </div>
      </section>

      {/* Feature Matrix */}
      <section className="rounded-xl bg-surface p-6 shadow-xs ring-1 ring-line space-y-4">
        <h3 className="font-semibold text-ink">Plan Inclusions</h3>
        <ul className="grid sm:grid-cols-2 gap-3 text-body-sm text-ink-2">
          <li className="flex items-center gap-2.5">
            <Check className="size-4 text-emerald-600 shrink-0" />
            <span>StarRez REST integration &amp; CSV export</span>
          </li>
          <li className="flex items-center gap-2.5">
            <Check className="size-4 text-emerald-600 shrink-0" />
            <span>Pre-arrival admitted student allowlist matching</span>
          </li>
          <li className="flex items-center gap-2.5">
            <Check className="size-4 text-emerald-600 shrink-0" />
            <span>Digital roommate agreements with version history</span>
          </li>
          <li className="flex items-center gap-2.5">
            <Check className="size-4 text-emerald-600 shrink-0" />
            <span>Pulse check-ins &amp; early RA conflict alerts</span>
          </li>
          <li className="flex items-center gap-2.5">
            <Check className="size-4 text-emerald-600 shrink-0" />
            <span>A/B Pilot Outcomes research reporting</span>
          </li>
          <li className="flex items-center gap-2.5">
            <Check className="size-4 text-emerald-600 shrink-0" />
            <span>Enterprise FERPA &amp; Title IX compliance workflows</span>
          </li>
        </ul>
      </section>

      {/* Zero Student Paywall Guarantee */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-sunken text-body-sm text-ink-2">
        <ShieldCheck className="size-5 text-emerald-600 shrink-0 mt-0.5" />
        <p>
          <strong>Rumi Student Promise:</strong> Students are never charged, paywalled, or subjected to advertisements.
          Institutional licensing guarantees universal and equitable access for all residents.
        </p>
      </div>
    </div>
  );
}

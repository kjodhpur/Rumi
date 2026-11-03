import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { canManageAccommodations } from "@/app/actions/accommodations";
import { AccommodationsManager, type AccommodationStudent } from "@/components/staff/accommodations-manager";
import { PermissionDenied } from "@/components/staff/permission-denied";

export const metadata: Metadata = { title: "Accommodations" };
export const dynamic = "force-dynamic";

/**
 * Approved accommodations for students who share with the housing office. Visible only to
 * housing admins and accommodation coordinators; never to RAs or analysts. Audited.
 */
export default async function AccommodationsPage({ searchParams }: { searchParams: { q?: string } }) {
  const context = await requireStaffPage("manageAccommodations");
  const actorId = await canManageAccommodations(context.school.id);
  if (!actorId) {
    return <PermissionDenied title="Accommodations" description="Only housing admins and staff your admin marks as accommodation coordinators can see this page." />;
  }

  const db = createAdminClient();
  const query = (searchParams.q ?? "").trim().slice(0, 60);
  const [{ data: types }, { data: constraints }] = await Promise.all([
    db.from("accommodation_types").select("key, label, active").eq("school_id", context.school.id).order("key"),
    db.from("accommodation_constraints").select("user_id, constraint_key, expires_on, note_enc, legal_hold, created_at").eq("school_id", context.school.id),
  ]);

  // Students who share with housing: everyone with a constraint, plus search results.
  const { data: consented } = await db.from("consents").select("user_id").eq("school_id", context.school.id).eq("kind", "share_with_housing").is("revoked_at", null);
  const consentedIds = new Set((consented ?? []).map((c) => c.user_id));
  const withConstraints = [...new Set((constraints ?? []).map((c) => c.user_id))];
  let found: string[] = [];
  if (query.length >= 2) {
    const { data: matches } = await db
      .from("profiles")
      .select("id")
      .eq("school_id", context.school.id)
      .eq("is_staff", false)
      .ilike("first_name", `%${query.replace(/[%_\\]/g, "")}%`)
      .limit(50);
    found = (matches ?? []).map((m) => m.id).filter((id) => consentedIds.has(id));
  }
  const ids = [...new Set([...withConstraints, ...found])];
  const { data: people } = ids.length
    ? await db.from("profiles").select("id, first_name, last_initial, class_year").in("id", ids)
    : { data: [] as { id: string; first_name: string; last_initial: string; class_year: string | null }[] };

  const students: AccommodationStudent[] = (people ?? []).map((p) => ({
    id: p.id,
    name: `${p.first_name}${p.last_initial ? ` ${p.last_initial}.` : ""}`,
    classYear: p.class_year,
    shares: consentedIds.has(p.id),
    constraints: (constraints ?? [])
      .filter((c) => c.user_id === p.id)
      .map((c) => {
        let note: string | null = null;
        try {
          note = c.note_enc ? decrypt(c.note_enc) : null;
        } catch {
          note = null;
        }
        return { key: c.constraint_key, expiresOn: c.expires_on, note, legalHold: c.legal_hold };
      }),
  }));

  await logAudit({ actorId, schoolId: context.school.id, action: "viewed_accommodations", entity: "accommodation_list", meta: { count: students.length, searched: query.length >= 2 } });
  return <AccommodationsManager schoolId={context.school.id} query={query} types={(types ?? []).filter((t) => t.active).map((t) => ({ key: t.key, label: t.label }))} students={students} />;
}

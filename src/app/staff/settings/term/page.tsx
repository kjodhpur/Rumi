import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/staff/context";
import { loadActiveTerm } from "@/lib/staff/dashboard";
import { TermSettings } from "@/components/staff/term-settings";

export const metadata: Metadata = { title: "Term" };

export default async function TermPage() {
  const context = await requireStaffPage("configureTerm");
  const term = await loadActiveTerm(context.school.id);
  return <TermSettings schoolId={context.school.id} term={term} />;
}

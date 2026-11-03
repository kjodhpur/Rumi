import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/staff/context";
import { loadRetention } from "@/lib/staff/team";
import { RetentionSettings } from "@/components/staff/retention-settings";

export const metadata: Metadata = { title: "Privacy & retention" };

export default async function StaffPrivacyPage() {
  const context = await requireStaffPage("managePrivacy");
  const { policy } = await loadRetention(context.school.id);
  return <RetentionSettings schoolId={context.school.id} office={context.school.housingOfficeName} policy={policy} />;
}

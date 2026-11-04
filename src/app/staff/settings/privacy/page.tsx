import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/staff/context";
import { loadRetention } from "@/lib/staff/team";
import { RetentionSettings } from "@/components/staff/retention-settings";
import { DataRequests } from "@/components/staff/data-requests";

export const metadata: Metadata = { title: "Privacy & retention" };

export default async function StaffPrivacyPage() {
  const context = await requireStaffPage("managePrivacy");
  const { policy } = await loadRetention(context.school.id);
  return (
    <div className="flex flex-col gap-8">
      <RetentionSettings
        schoolId={context.school.id}
        office={context.school.housingOfficeName}
        policy={policy}
      />
      <div className="max-w-[760px]">
        <DataRequests schoolId={context.school.id} />
      </div>
    </div>
  );
}

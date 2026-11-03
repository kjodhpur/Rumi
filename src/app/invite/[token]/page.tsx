import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/staff/tokens";
import { ROLE_INFO, isStaffRole } from "@/lib/staff/roles";
import { InviteAccept } from "@/components/staff/invite-accept";

export const metadata: Metadata = { title: "Join your housing team", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: { token: string } }) {
  const user = await getUser();
  if (!user) redirect(`/login?next=/invite/${encodeURIComponent(params.token)}`);

  const { data: invite } = await createAdminClient()
    .from("staff_invites")
    .select("email, role, expires_at, accepted_at, revoked_at, schools(name)")
    .eq("token_hash", hashToken(params.token))
    .maybeSingle();

  const state = !invite
    ? "invalid"
    : invite.revoked_at
      ? "revoked"
      : invite.accepted_at
        ? "used"
        : new Date(invite.expires_at).getTime() < Date.now()
          ? "expired"
          : (user.email ?? "").toLowerCase() !== invite.email
            ? "wrong_email"
            : "ready";

  return (
    <InviteAccept
      token={params.token}
      state={state}
      signedInAs={user.email ?? ""}
      invitedEmail={invite?.email ?? null}
      schoolName={(invite?.schools as { name: string } | null)?.name ?? null}
      roleLabel={invite && isStaffRole(invite.role) ? ROLE_INFO[invite.role].label : null}
      roleDescription={invite && isStaffRole(invite.role) ? ROLE_INFO[invite.role].description : null}
    />
  );
}

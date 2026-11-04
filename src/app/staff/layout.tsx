import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { can, getStaffContext } from "@/lib/staff/context";
import { ROLE_INFO } from "@/lib/staff/roles";
import { StaffShell } from "@/components/staff/staff-shell";
import { STAFF_NAV } from "@/components/staff/staff-nav";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions/auth";

export const metadata: Metadata = {
  title: { default: "Staff", template: "%s · Rumi staff" },
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login?next=/staff");
  const context = await getStaffContext();
  if (!context) return <NoAccess email={user.email ?? ""} />;

  const allowed = STAFF_NAV.flatMap((section) => section.items)
    .filter((item) => can(context, item.capability))
    .map((item) => item.href);

  return (
    <StaffShell
      firstName={context.firstName}
      roleLabel={context.role === "platform_admin" ? "Rumi team" : ROLE_INFO[context.role].label}
      isPlatformAdmin={context.isPlatformAdmin}
      school={{ id: context.school.id, name: context.school.name, isDemo: context.school.isDemo }}
      schools={context.schools.map((s) => ({ id: s.id, name: s.name }))}
      allowed={allowed}
    >
      {children}
    </StaffShell>
  );
}

function NoAccess({ email }: { email: string }) {
  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4 py-16 text-center"
    >
      <Wordmark height={28} className="text-ink" />
      <h1 className="mt-10 font-display text-display-md text-ink">No staff access</h1>
      <p className="mt-3 max-w-[420px] text-body text-ink-2">
        {email} isn&apos;t on a housing team, or its access was turned off. Ask your housing admin
        for an invite.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="secondary">
          <Link href="/">Back to Rumi</Link>
        </Button>
        <form action={signOut}>
          <Button type="submit" variant="ghost">
            Sign in with another email
          </Button>
        </form>
      </div>
    </main>
  );
}

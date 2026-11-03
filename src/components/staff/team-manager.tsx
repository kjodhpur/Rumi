"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, MoreHorizontal, Plus, RotateCw, UserRoundCog, UserRoundX, UserRoundCheck, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { OptionCards } from "@/components/ui/choice";
import { RelativeTime } from "@/components/ui/relative-time";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { inviteStaff, resendInvite, revokeInvite, setStaffDisabled, updateStaffMember } from "@/app/actions/staff";
import { ROLE_INFO, STAFF_ROLES, type StaffRole } from "@/lib/staff/roles";
import type { PendingInvite, TeamMember } from "@/lib/staff/team";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = STAFF_ROLES.map((role) => ({ value: role, label: ROLE_INFO[role].label, hint: ROLE_INFO[role].description }));

interface Props {
  schoolId: string;
  domains: string[];
  currentUserId: string;
  members: TeamMember[];
  invites: PendingInvite[];
}

export function TeamManager({ schoolId, domains, currentUserId, members, invites }: Props) {
  const router = useRouter();
  const [inviting, setInviting] = React.useState(false);
  const [editing, setEditing] = React.useState<TeamMember | null>(null);

  async function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    const result = await action();
    if (!result.ok) return void toast.error(result.error);
    toast.success(success);
    router.refresh();
  }

  const active = members.filter((m) => !m.disabled);
  const disabled = members.filter((m) => m.disabled);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Team"
        description="Who can see what. Every change is recorded in the audit log."
        className="pb-0 lg:pb-0"
        actions={
          <Button onClick={() => setInviting(true)}>
            <Plus aria-hidden /> Invite
          </Button>
        }
      />

      <section aria-labelledby="members-title">
        <h2 id="members-title" className="sr-only">
          Team members
        </h2>
        <ul className="divide-y divide-line overflow-hidden rounded-xl bg-surface shadow-xs ring-1 ring-line">
          {[...active, ...disabled].map((member) => (
            <li key={member.id} className={cn("flex items-center gap-3 px-4 py-3.5 sm:px-5", member.disabled && "bg-surface-sunken/50")}>
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-body-sm font-semibold text-ink-2"
              >
                {member.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={cn("truncate text-body-sm font-medium", member.disabled ? "text-ink-3" : "text-ink")}>
                    {member.name}
                    {member.userId === currentUserId ? <span className="text-ink-3"> (you)</span> : null}
                  </span>
                  {member.disabled ? <Badge size="sm" variant="outline">Access off</Badge> : null}
                </span>
                <span className="block truncate text-caption text-ink-3">
                  <span className="sm:hidden">{ROLE_INFO[member.role].label} · </span>
                  {member.email}
                </span>
                {member.role === "ra" && member.scopes.buildings.length > 0 ? (
                  <span className="mt-1 block truncate text-caption text-ink-2">{member.scopes.buildings.join(", ")}</span>
                ) : null}
              </span>
              <Badge variant={member.role === "housing_admin" ? "solid" : "neutral"} className="hidden sm:inline-flex">
                {ROLE_INFO[member.role].label}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${member.name}`}>
                    <MoreHorizontal aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[220px]">
                  <DropdownMenuItem onSelect={() => setEditing(member)}>
                    <UserRoundCog /> Change role
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {member.disabled ? (
                    <DropdownMenuItem
                      onSelect={() =>
                        void run(() => setStaffDisabled({ memberId: member.id, disabled: false }), `${member.name} has access again`)
                      }
                    >
                      <UserRoundCheck /> Turn access back on
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      className="text-danger"
                      onSelect={() =>
                        void run(() => setStaffDisabled({ memberId: member.id, disabled: true }), `${member.name}'s access is off`)
                      }
                    >
                      <UserRoundX /> Turn off access
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="invites-title" className="flex flex-col gap-3">
        <h2 id="invites-title" className="text-title font-semibold text-ink">
          Pending invites
        </h2>
        {invites.length === 0 ? (
          <p className="rounded-xl bg-surface px-5 py-4 text-body-sm text-ink-3 ring-1 ring-line">
            No invites waiting. People appear on the team as soon as they accept.
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl bg-surface shadow-xs ring-1 ring-line">
            {invites.map((invite) => (
              <li key={invite.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <Mail className="size-5 shrink-0 text-ink-3" strokeWidth={1.75} aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-body-sm font-medium text-ink">{invite.email}</span>
                    <span className="block text-caption text-ink-3">
                      {ROLE_INFO[invite.role].label}
                      {invite.invitedBy ? ` · from ${invite.invitedBy}` : ""} ·{" "}
                      <RelativeTime iso={invite.expiresAt} prefix="expires " />
                    </span>
                  </span>
                </span>
                <span className="flex gap-2 pl-8 sm:pl-0">
                  <Button variant="secondary" size="sm" onClick={() => void run(() => resendInvite(invite.id), `Invite resent to ${invite.email}`)}>
                    <RotateCw aria-hidden /> Resend
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void run(() => revokeInvite(invite.id), "Invite withdrawn")}>
                    <X aria-hidden /> Withdraw
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <InviteSheet
        open={inviting}
        onOpenChange={setInviting}
        schoolId={schoolId}
        domains={domains}
        onDone={() => router.refresh()}
      />
      <RoleSheet member={editing} onClose={() => setEditing(null)} onDone={() => router.refresh()} />
    </div>
  );
}

function BuildingsInput({ value, onChange, error }: { value: string[]; onChange: (v: string[]) => void; error?: string | null }) {
  const [draft, setDraft] = React.useState("");
  function add() {
    const parts = draft.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return;
    onChange([...new Set([...value, ...parts])].slice(0, 40));
    setDraft("");
  }
  return (
    <Field label="Buildings" hint="RAs only see students and alerts in these buildings. Press Enter after each one." error={error}>
      {({ id, describedBy, invalid }) => (
        <div className="flex flex-col gap-2">
          <Input
            id={id}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                add();
              }
            }}
            onBlur={add}
            placeholder="e.g. Manzanita Hall"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            autoComplete="off"
          />
          {value.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5" aria-label="Selected buildings">
              {value.map((b) => (
                <li key={b}>
                  <span className="inline-flex h-8 items-center gap-1 rounded-full bg-surface-sunken pr-1 pl-3 text-body-sm text-ink">
                    {b}
                    <button
                      type="button"
                      onClick={() => onChange(value.filter((x) => x !== b))}
                      className="flex size-6 items-center justify-center rounded-full text-ink-3 outline-none hover:bg-surface-hover hover:text-ink focus-visible:ring-2 focus-visible:ring-focus"
                      aria-label={`Remove ${b}`}
                    >
                      <X className="size-3.5" strokeWidth={2} aria-hidden />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </Field>
  );
}

function InviteSheet({
  open,
  onOpenChange,
  schoolId,
  domains,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  domains: string[];
  onDone: () => void;
}) {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<StaffRole>("housing_staff");
  const [buildings, setBuildings] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setEmail("");
      setRole("housing_staff");
      setBuildings([]);
      setError(null);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await inviteStaff({ schoolId, email, role, buildings });
    setPending(false);
    if (!result.ok) return setError(result.error);
    toast.success(`Invite sent to ${email.trim().toLowerCase()}`, { description: "The link works for 7 days." });
    onOpenChange(false);
    onDone();
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Invite to the team"
      description={`They'll get an email and sign in with their ${domains.map((d) => `@${d}`).join(" or ")} address.`}
      size="lg"
      footer={
        <Button type="submit" form="invite-form" block loading={pending}>
          Send invite
        </Button>
      }
    >
      <form id="invite-form" onSubmit={submit} className="flex flex-col gap-6" noValidate>
        <Field label="Email" error={error}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="email"
              inputMode="email"
              autoComplete="off"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder={`name@${domains[0] ?? "school.edu"}`}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              required
            />
          )}
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-body-sm font-medium text-ink">Role</legend>
          <OptionCards value={role} onValueChange={setRole} options={ROLE_OPTIONS} columns={2} aria-label="Role" className="grid-cols-1 sm:grid-cols-2" />
        </fieldset>
        {role === "ra" ? <BuildingsInput value={buildings} onChange={setBuildings} /> : null}
      </form>
    </Sheet>
  );
}

function RoleSheet({ member, onClose, onDone }: { member: TeamMember | null; onClose: () => void; onDone: () => void }) {
  const [role, setRole] = React.useState<StaffRole>("housing_staff");
  const [buildings, setBuildings] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (member) {
      setRole(member.role);
      setBuildings(member.scopes.buildings);
      setError(null);
    }
  }, [member]);

  async function save() {
    if (!member) return;
    setPending(true);
    const result = await updateStaffMember({ memberId: member.id, role, buildings });
    setPending(false);
    if (!result.ok) return setError(result.error);
    toast.success(`${member.name}'s role is now ${ROLE_INFO[role].label}`);
    onClose();
    onDone();
  }

  return (
    <Sheet
      open={Boolean(member)}
      onOpenChange={(open) => !open && onClose()}
      title={member ? `Change ${member.name}'s role` : "Change role"}
      size="lg"
      footer={
        <Button block onClick={() => void save()} loading={pending}>
          Save
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        {error ? (
          <p role="alert" className="rounded-md bg-danger-soft px-3.5 py-2.5 text-body-sm text-danger">
            {error}
          </p>
        ) : null}
        <OptionCards value={role} onValueChange={setRole} options={ROLE_OPTIONS} columns={2} aria-label="Role" className="grid-cols-1 sm:grid-cols-2" />
        {role === "ra" ? <BuildingsInput value={buildings} onChange={setBuildings} /> : null}
      </div>
    </Sheet>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ExternalLink, UserCheck, UserPlus } from "lucide-react";
import { InstagramMark } from "@/components/brand/instagram-mark";
import { LinkedinMark } from "@/components/brand/linkedin-mark";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  removePeerConnection,
  requestPeerConnection,
  respondPeerConnection,
} from "@/app/actions/social-links";
import type { ProfileDetail } from "@/lib/profile";
import { useT } from "@/components/providers/i18n";

/**
 * Trust signals (Phase 7.2): handles shown as links only (no API calls, "confirmed" is
 * self-attested), mutual connections from people who also opted in, and a "we know each
 * other" connection both sides must confirm. None of it changes the match score.
 */
export function ProfileTrust({ detail, isSelf }: { detail: ProfileDetail; isSelf: boolean }) {
  const router = useRouter();
  const t = useT("profile");
  const [pending, setPending] = React.useState(false);
  const { socialLinks, mutualCount, mutualContacts, connection, firstName } = detail;

  async function run(
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    success: string,
  ) {
    setPending(true);
    const result = await action();
    setPending(false);
    if (!result.ok) return void toast.error(result.error);
    toast.success(success);
    router.refresh();
  }

  const hasLinks = socialLinks.length > 0;
  const showMutuals = !isSelf && Boolean(mutualCount);
  const showConnect = !isSelf;
  if (!hasLinks && !showMutuals && !showConnect) return null;

  return (
    <section className="mt-6 flex flex-col gap-4" aria-label={t("trust.label")}>
      {hasLinks ? (
        <ul className="flex flex-wrap gap-2">
          {socialLinks.map((link) => (
            <li key={link.platform}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface px-3 text-caption font-medium text-ink ring-1 ring-line transition-colors hover:bg-surface-hover"
              >
                {link.platform === "instagram" ? (
                  <InstagramMark className="size-4" />
                ) : (
                  <LinkedinMark className="size-4" />
                )}
                <span>@{link.handle}</span>
                {link.verified ? (
                  <span className="inline-flex items-center gap-0.5 text-ink-3">
                    <Check className="size-3" strokeWidth={2.5} aria-hidden />{" "}
                    {t("trust.selfConfirmed")}
                  </span>
                ) : null}
                <ExternalLink className="size-3 text-ink-3" aria-hidden />
                <span className="sr-only">
                  {t("trust.opens", {
                    platform: link.platform === "instagram" ? "Instagram" : "LinkedIn",
                  })}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {showMutuals ? (
        <div className="rounded-lg bg-surface p-4 ring-1 ring-line">
          <p className="text-body-sm font-medium text-ink">
            {t("trust.mutuals", { count: mutualCount ?? 0 })}
          </p>
          {mutualContacts.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {mutualContacts.map((contact) => (
                <li
                  key={contact.userId}
                  className="inline-flex items-center gap-2 rounded-full bg-surface-sunken py-1 pr-3 pl-1 text-caption text-ink"
                >
                  <Avatar
                    src={contact.avatarUrl}
                    firstName={contact.firstName}
                    lastInitial={contact.lastInitial}
                    size={24}
                  />
                  {contact.firstName} {contact.lastInitial}.
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-2 text-caption text-ink-3">{t("trust.mutualsHint")}</p>
        </div>
      ) : null}

      {showConnect ? (
        <div className="flex flex-wrap items-center gap-3">
          {!connection ? (
            <Button
              variant="secondary"
              size="sm"
              loading={pending}
              onClick={() =>
                void run(
                  () => requestPeerConnection(detail.id),
                  t("trust.asked", { name: firstName }),
                )
              }
            >
              <UserPlus aria-hidden /> {t("trust.weKnow")}
            </Button>
          ) : connection.status === "confirmed" ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-caption font-medium text-ink-2">
                <UserCheck className="size-4 text-success" aria-hidden /> {t("trust.confirmed")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                loading={pending}
                onClick={() =>
                  void run(() => removePeerConnection(connection.id), t("trust.removed"))
                }
              >
                {t("trust.remove")}
              </Button>
            </>
          ) : connection.direction === "received" ? (
            <>
              <span className="text-caption text-ink-2">
                {t("trust.saysKnow", { name: firstName })}
              </span>
              <Button
                size="sm"
                loading={pending}
                onClick={() =>
                  void run(
                    () => respondPeerConnection(connection.id, true),
                    t("trust.confirmedToast"),
                  )
                }
              >
                {t("trust.confirm")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() =>
                  void run(() => respondPeerConnection(connection.id, false), t("trust.declined"))
                }
              >
                {t("trust.notReally")}
              </Button>
            </>
          ) : (
            <>
              <span className="text-caption text-ink-3">
                {t("trust.waiting", { name: firstName })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                loading={pending}
                onClick={() =>
                  void run(() => removePeerConnection(connection.id), t("trust.withdrawn"))
                }
              >
                {t("trust.withdraw")}
              </Button>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}

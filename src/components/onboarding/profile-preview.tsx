"use client";

import Image from "next/image";
import { Sparkle } from "lucide-react";
import { Monogram } from "@/components/ui/monogram";
import { labelOf } from "@/lib/options";
import { useIntlLocale, useOptions, useT } from "@/components/providers/i18n";
import { formatBudget } from "@/lib/utils";
import { imagePlaceholder, photoUrl } from "@/lib/photos";
import { moveInLabel } from "@/components/matches/card-meta";
import type { PhotoRecord } from "@/app/actions/photos";
import type { AreaOption, PrefsDraft, ProfileDraft } from "./types";

/** Live preview of the match card others will see, updating as you type. */
export function ProfilePreview({
  profile,
  prefs,
  photos,
  areas,
}: {
  profile: ProfileDraft;
  prefs: PrefsDraft;
  photos: PhotoRecord[];
  areas: AreaOption[];
}) {
  const t = useT("onboarding");
  const intl = useIntlLocale();
  const { CLASS_YEARS } = useOptions();
  const cover = [...photos].sort((a, b) => a.position - b.position)[0];
  const name = profile.firstName
    ? `${profile.firstName}${profile.lastName ? ` ${profile.lastName.charAt(0).toUpperCase()}.` : ""}`
    : t("previewCard.yourName");
  const meta = [labelOf(CLASS_YEARS, profile.classYear), profile.major].filter(Boolean).join(" · ");
  const areaName = areas.find((a) => a.slug === prefs.areas[0])?.name.split(" — ")[0];

  return (
    <div className="w-full max-w-[340px] rounded-[28px] bg-surface p-3 shadow-lg ring-1 ring-line">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] bg-surface-sunken">
        {cover ? (
          <Image
            src={photoUrl(cover.storage_path)!}
            alt=""
            fill
            sizes="340px"
            className="object-cover"
            placeholder={imagePlaceholder(cover.placeholder)}
          />
        ) : (
          <Monogram
            name={profile.firstName || "?"}
            seed={profile.firstName || "you"}
            rounded="rounded-none"
            className="[container-type:size] absolute inset-0"
          />
        )}
        <span className="absolute top-3 left-3 rounded-full bg-surface px-3 py-1.5 text-caption font-semibold text-ink shadow-md">
          {t("previewCard.you")}
        </span>
      </div>
      <div className="px-1.5 pt-3.5 pb-2">
        <p className="truncate text-title font-semibold text-ink">{name}</p>
        <p className="truncate text-body-sm text-ink-2">{meta || t("previewCard.meta")}</p>
        <p className="mt-2 line-clamp-2 min-h-10 text-body-sm text-ink-2">
          {profile.bio || t("previewCard.bio")}
        </p>
        <div className="mt-3 flex items-center gap-2 text-body-sm text-ink">
          <Sparkle
            className="size-3.5 shrink-0 fill-accent text-accent"
            strokeWidth={0}
            aria-hidden
          />
          <span className="text-ink-2">{t("previewCard.reasons")}</span>
        </div>
        <p className="mt-3 truncate text-caption text-ink-3">
          {[
            formatBudget(prefs.budgetMin, prefs.budgetMax),
            prefs.moveInDate
              ? t("previewCard.moves", { date: moveInLabel(prefs.moveInDate, intl) ?? "" })
              : null,
            areaName,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { Sparkle } from "lucide-react";
import { Monogram } from "@/components/ui/monogram";
import { CLASS_YEARS, labelOf } from "@/lib/options";
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
  const cover = [...photos].sort((a, b) => a.position - b.position)[0];
  const name = profile.firstName
    ? `${profile.firstName}${profile.lastName ? ` ${profile.lastName.charAt(0).toUpperCase()}.` : ""}`
    : "Your name";
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
            className="absolute inset-0 [container-type:size]"
          />
        )}
        <span className="absolute top-3 left-3 rounded-full bg-surface px-3 py-1.5 text-caption font-semibold text-ink shadow-md">
          You
        </span>
      </div>
      <div className="px-1.5 pt-3.5 pb-2">
        <p className="truncate text-title font-semibold text-ink">{name}</p>
        <p className="truncate text-body-sm text-ink-2">{meta || "Year · Major"}</p>
        <p className="mt-2 line-clamp-2 min-h-10 text-body-sm text-ink-2">
          {profile.bio || "Your bio shows here — a couple of lines about you."}
        </p>
        <div className="mt-3 flex items-center gap-2 text-body-sm text-ink">
          <Sparkle className="size-3.5 shrink-0 fill-accent text-accent" strokeWidth={0} aria-hidden />
          <span className="text-ink-2">Reasons you match appear here</span>
        </div>
        <p className="mt-3 truncate text-caption text-ink-3">
          {[formatBudget(prefs.budgetMin, prefs.budgetMax), prefs.moveInDate ? `Moves ${moveInLabel(prefs.moveInDate)}` : null, areaName]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </div>
  );
}

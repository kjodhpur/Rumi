"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BIO_MAX,
  BUDGET_MAX,
  BUDGET_MIN,
  CAMPUSES,
  DRINKING,
  GENDER_PREF,
  IMPORTANCE,
  LEASE_LENGTHS,
  LOOKING_FOR,
  LIFESTYLE_LABELS,
  LIFESTYLE_SCALE_ENDS,
  LIFESTYLE_SCALE_KEYS,
  MOVE_IN_TERMS,
  OWN_GENDER,
  PETS,
  PLACE_STATUS,
  PREFERRED_AREAS,
  ROOMMATE_COUNTS,
  SMOKING,
  YEARS,
} from "@/lib/constants";
import {
  completeOnboarding,
  saveBasics,
  saveDealbreakers,
  saveHousing,
  saveLifestyle,
  saveWeights,
} from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import type { Importance } from "@/lib/types";

const STEPS = ["Basics", "Housing", "Lifestyle", "Dealbreakers", "Weights", "Spotify"];

type Basics = {
  first_name: string;
  last_initial: string;
  pronouns: string;
  year: (typeof YEARS)[number];
  major: string;
  campus: (typeof CAMPUSES)[number];
  bio: string;
  instagram: string;
  own_gender: (typeof OWN_GENDER)[number];
  show_gender_publicly: boolean;
};

export function OnboardingWizard({
  initialStep = 0,
  spotifyConnected = false,
}: {
  initialStep?: number;
  spotifyConnected?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(Math.min(initialStep, STEPS.length - 1));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [basics, setBasics] = useState<Basics>({
    first_name: "",
    last_initial: "",
    pronouns: "",
    year: "Freshman",
    major: "",
    campus: "Tempe",
    bio: "",
    instagram: "",
    own_gender: "prefer-not-to-say",
    show_gender_publicly: false,
  });

  const [housing, setHousing] = useState({
    looking_for: "either" as (typeof LOOKING_FOR)[number],
    budget_min: 600,
    budget_max: 1200,
    preferred_areas: ["Tempe near campus"] as Array<(typeof PREFERRED_AREAS)[number]>,
    move_in_term: "Fall 2027" as (typeof MOVE_IN_TERMS)[number],
    lease_length: "flexible" as (typeof LEASE_LENGTHS)[number],
    roommates_wanted: "1" as (typeof ROOMMATE_COUNTS)[number],
    place_status: "needs-place" as (typeof PLACE_STATUS)[number],
  });

  const [lifestyle, setLifestyle] = useState({
    sleep_schedule: 3,
    cleanliness: 3,
    guests: 3,
    noise_tolerance: 3,
    social_level: 3,
    study_at_home: 3,
    cooking_sharing: 3,
    smoking: "no" as (typeof SMOKING)[number],
    drinking: "socially" as (typeof DRINKING)[number],
    pets: "ok-with-pets" as (typeof PETS)[number],
    gender_preference: "no-preference" as (typeof GENDER_PREF)[number],
  });

  const [dealbreakers, setDealbreakers] = useState<string[]>([]);
  const [weights, setWeights] = useState<Record<string, Importance>>(
    Object.fromEntries(LIFESTYLE_SCALE_KEYS.map((k) => [k, "somewhat" as Importance])),
  );

  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);

  function toggleArea(area: (typeof PREFERRED_AREAS)[number]) {
    setHousing((h) => {
      const has = h.preferred_areas.includes(area);
      return {
        ...h,
        preferred_areas: has
          ? h.preferred_areas.filter((a) => a !== area)
          : [...h.preferred_areas, area],
      };
    });
  }

  function toggleDealbreaker(key: string) {
    setDealbreakers((d) => (d.includes(key) ? d.filter((x) => x !== key) : [...d, key]));
  }

  function next() {
    setError(null);
    startTransition(async () => {
      try {
        if (step === 0) {
          await saveBasics({
            ...basics,
            photo_url: null,
            pronouns: basics.pronouns || null,
            instagram: basics.instagram || null,
          });
        } else if (step === 1) {
          await saveHousing(housing);
        } else if (step === 2) {
          await saveLifestyle(lifestyle);
        } else if (step === 3) {
          await saveDealbreakers({ dealbreakers });
        } else if (step === 4) {
          await saveWeights({ weights });
        } else if (step === 5) {
          await completeOnboarding();
          router.push("/matches");
          return;
        }
        setStep((s) => Math.min(s + 1, STEPS.length - 1));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <p className="text-sm font-medium text-asu-maroon">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
        <Progress value={progress} className="mt-2" />
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {step === 0 ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                value={basics.first_name}
                onChange={(e) => setBasics({ ...basics, first_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_initial">Last initial (public)</Label>
              <Input
                id="last_initial"
                maxLength={1}
                value={basics.last_initial}
                onChange={(e) => setBasics({ ...basics, last_initial: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pronouns">Pronouns (optional)</Label>
            <Input
              id="pronouns"
              value={basics.pronouns}
              onChange={(e) => setBasics({ ...basics, pronouns: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Year</Label>
            <div className="flex flex-wrap gap-2">
              {YEARS.map((y) => (
                <Chip key={y} selected={basics.year === y} onClick={() => setBasics({ ...basics, year: y })}>
                  {y}
                </Chip>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="major">Major</Label>
            <Input
              id="major"
              value={basics.major}
              onChange={(e) => setBasics({ ...basics, major: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Campus</Label>
            <div className="flex flex-wrap gap-2">
              {CAMPUSES.map((c) => (
                <Chip key={c} selected={basics.campus === c} onClick={() => setBasics({ ...basics, campus: c })}>
                  {c}
                </Chip>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Short bio ({basics.bio.length}/{BIO_MAX})</Label>
            <Textarea
              id="bio"
              maxLength={BIO_MAX}
              value={basics.bio}
              onChange={(e) => setBasics({ ...basics, bio: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram (optional)</Label>
            <Input
              id="instagram"
              placeholder="@sun_devil"
              value={basics.instagram}
              onChange={(e) => setBasics({ ...basics, instagram: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Your gender (for matching filters)</Label>
            <div className="flex flex-wrap gap-2">
              {OWN_GENDER.map((g) => (
                <Chip
                  key={g}
                  selected={basics.own_gender === g}
                  onClick={() => setBasics({ ...basics, own_gender: g })}
                >
                  {g}
                </Chip>
              ))}
            </div>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={basics.show_gender_publicly}
                onChange={(e) =>
                  setBasics({ ...basics, show_gender_publicly: e.target.checked })
                }
              />
              Show gender on my public profile
            </label>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Looking for</Label>
            <div className="flex flex-wrap gap-2">
              {LOOKING_FOR.map((v) => (
                <Chip
                  key={v}
                  selected={housing.looking_for === v}
                  onClick={() => setHousing({ ...housing, looking_for: v })}
                >
                  {v}
                </Chip>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>
              Budget ${housing.budget_min} – ${housing.budget_max}
            </Label>
            <input
              type="range"
              min={BUDGET_MIN}
              max={BUDGET_MAX}
              step={50}
              value={housing.budget_min}
              onChange={(e) =>
                setHousing({
                  ...housing,
                  budget_min: Math.min(Number(e.target.value), housing.budget_max),
                })
              }
              className="w-full"
              aria-label="Minimum budget"
            />
            <input
              type="range"
              min={BUDGET_MIN}
              max={BUDGET_MAX}
              step={50}
              value={housing.budget_max}
              onChange={(e) =>
                setHousing({
                  ...housing,
                  budget_max: Math.max(Number(e.target.value), housing.budget_min),
                })
              }
              className="w-full"
              aria-label="Maximum budget"
            />
          </div>
          <div className="space-y-2">
            <Label>Preferred areas</Label>
            <div className="flex flex-wrap gap-2">
              {PREFERRED_AREAS.map((a) => (
                <Chip
                  key={a}
                  selected={housing.preferred_areas.includes(a)}
                  onClick={() => toggleArea(a)}
                >
                  {a}
                </Chip>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Move-in term</Label>
            <div className="flex flex-wrap gap-2">
              {MOVE_IN_TERMS.map((t) => (
                <Chip
                  key={t}
                  selected={housing.move_in_term === t}
                  onClick={() => setHousing({ ...housing, move_in_term: t })}
                >
                  {t}
                </Chip>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Lease length</Label>
            <div className="flex flex-wrap gap-2">
              {LEASE_LENGTHS.map((t) => (
                <Chip
                  key={t}
                  selected={housing.lease_length === t}
                  onClick={() => setHousing({ ...housing, lease_length: t })}
                >
                  {t}
                </Chip>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Roommates wanted</Label>
            <div className="flex flex-wrap gap-2">
              {ROOMMATE_COUNTS.map((t) => (
                <Chip
                  key={t}
                  selected={housing.roommates_wanted === t}
                  onClick={() => setHousing({ ...housing, roommates_wanted: t })}
                >
                  {t}
                </Chip>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Place status</Label>
            <div className="flex flex-wrap gap-2">
              {PLACE_STATUS.map((t) => (
                <Chip
                  key={t}
                  selected={housing.place_status === t}
                  onClick={() => setHousing({ ...housing, place_status: t })}
                >
                  {t === "has-place" ? "I have a place" : "I need a place"}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-6">
          {LIFESTYLE_SCALE_KEYS.map((key) => (
            <div key={key} className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>{LIFESTYLE_LABELS[key]}</Label>
                <span className="text-rumi-muted">{lifestyle[key]}/5</span>
              </div>
              <div className="flex justify-between text-xs text-rumi-muted">
                <span>{LIFESTYLE_SCALE_ENDS[key][0]}</span>
                <span>{LIFESTYLE_SCALE_ENDS[key][1]}</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={lifestyle[key]}
                onChange={(e) =>
                  setLifestyle({ ...lifestyle, [key]: Number(e.target.value) })
                }
                className="w-full"
                aria-label={LIFESTYLE_LABELS[key]}
              />
            </div>
          ))}
          {(
            [
              ["smoking", SMOKING, "Smoking / vaping"],
              ["drinking", DRINKING, "Drinking"],
              ["pets", PETS, "Pets"],
              ["gender_preference", GENDER_PREF, "Gender preference for roommate"],
            ] as const
          ).map(([field, options, label]) => (
            <div key={field} className="space-y-2">
              <Label>{label}</Label>
              <div className="flex flex-wrap gap-2">
                {options.map((opt) => (
                  <Chip
                    key={opt}
                    selected={lifestyle[field] === opt}
                    onClick={() => setLifestyle({ ...lifestyle, [field]: opt })}
                  >
                    {opt}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <p className="text-sm text-rumi-muted">
            Mark anything that is a hard no. Dealbreakers filter matches completely.
          </p>
          <div className="flex flex-wrap gap-2">
            {[...LIFESTYLE_SCALE_KEYS, "smoking", "drinking", "pets"].map((key) => (
              <Chip
                key={key}
                selected={dealbreakers.includes(key)}
                onClick={() => toggleDealbreaker(key)}
              >
                {LIFESTYLE_LABELS[key as keyof typeof LIFESTYLE_LABELS] ?? key}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-4">
          <p className="text-sm text-rumi-muted">
            How important is each lifestyle category when scoring matches?
          </p>
          {LIFESTYLE_SCALE_KEYS.map((key) => (
            <div key={key} className="space-y-2">
              <Label>{LIFESTYLE_LABELS[key]}</Label>
              <div className="flex flex-wrap gap-2">
                {IMPORTANCE.map((imp) => (
                  <Chip
                    key={imp}
                    selected={weights[key] === imp}
                    onClick={() => setWeights({ ...weights, [key]: imp })}
                  >
                    {imp === "not" ? "Not important" : imp === "somewhat" ? "Somewhat" : "Very"}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {step === 5 ? (
        <div className="space-y-4">
          <h2 className="font-display text-2xl text-asu-maroon">Connect Spotify (optional)</h2>
          <p className="text-sm text-rumi-muted">
            We use your top artists and genres to boost music-taste compatibility. You can skip and
            connect later from your profile.
          </p>
          {spotifyConnected ? (
            <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
              Spotify connected. You&apos;re good to finish.
            </p>
          ) : (
            <a href="/api/spotify/login">
              <Button type="button" variant="secondary">
                Connect Spotify
              </Button>
            </a>
          )}
        </div>
      ) : null}

      <div className="flex justify-between gap-3 pt-4">
        <Button
          type="button"
          variant="ghost"
          disabled={step === 0 || pending}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </Button>
        <Button type="button" onClick={next} disabled={pending}>
          {pending ? "Saving…" : step === STEPS.length - 1 ? "Finish & see matches" : "Continue"}
        </Button>
      </div>
    </div>
  );
}

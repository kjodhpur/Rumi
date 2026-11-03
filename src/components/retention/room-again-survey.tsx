"use client";

import * as React from "react";
import { Sparkles, ThumbsUp, ThumbsDown, HelpCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice";
import { submitOutcomeSurvey } from "@/app/actions/outcome-surveys";

interface RoomAgainSurveyProps {
  termId: string;
  groupId: string;
  groupName?: string;
  onSubmitted?: () => void;
}

const TAG_OPTIONS = [
  { value: "communication", label: "Great communication" },
  { value: "cleanliness", label: "Cleanliness sync" },
  { value: "quiet_hours", label: "Respected quiet hours" },
  { value: "guests", label: "Guest limits respected" },
  { value: "schedules", label: "Compatible sleep schedules" },
  { value: "friendship", label: "Became close friends" },
];

export function RoomAgainSurvey({
  termId,
  groupId,
  groupName = "your room",
  onSubmitted,
}: RoomAgainSurveyProps) {
  const [roomAgain, setRoomAgain] = React.useState<"yes" | "maybe" | "no" | "">("");
  const [score, setScore] = React.useState<number>(5);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [win, setWin] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!roomAgain) {
      toast("Please answer whether you'd room together again.");
      return;
    }

    setLoading(true);
    const res = await submitOutcomeSurvey(
      termId,
      groupId,
      roomAgain,
      score,
      selectedTags,
      win.trim() || undefined,
    );
    setLoading(false);

    if (res.ok) {
      setSubmitted(true);
      toast.success("Thank you for sharing your experience!", {
        description: "Your feedback helps improve roommate matching for everyone.",
      });
      onSubmitted?.();
    } else {
      toast.error(res.error);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6 text-center">
        <CheckCircle2 className="mx-auto size-8 text-accent" />
        <h3 className="mt-2 text-body font-semibold text-ink">End-of-Year Survey Completed</h3>
        <p className="mt-1 text-body-sm text-ink-3">
          Your answers have been recorded for next year's room selection.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
      <div className="flex items-center gap-2 text-body-xs font-semibold uppercase tracking-wider text-accent">
        <Sparkles className="size-4" />
        <span>End-of-Year Check-In</span>
      </div>
      <h3 className="mt-1 text-body-lg font-semibold text-ink">
        Would you room with {groupName} again?
      </h3>
      <p className="text-body-sm text-ink-3">
        Private to housing in aggregate. Answering &ldquo;Yes&rdquo; lets you carry your group forward into next year.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="text-body-xs font-semibold text-ink">
            Would you live together next year?
          </label>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setRoomAgain("yes")}
              className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-body-sm font-medium transition-colors ${
                roomAgain === "yes"
                  ? "border-accent bg-accent/10 text-accent font-semibold"
                  : "border-line bg-surface hover:bg-surface-sunken text-ink"
              }`}
            >
              <ThumbsUp className="size-4" />
              <span>Yes</span>
            </button>
            <button
              type="button"
              onClick={() => setRoomAgain("maybe")}
              className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-body-sm font-medium transition-colors ${
                roomAgain === "maybe"
                  ? "border-accent bg-accent/10 text-accent font-semibold"
                  : "border-line bg-surface hover:bg-surface-sunken text-ink"
              }`}
            >
              <HelpCircle className="size-4" />
              <span>Maybe</span>
            </button>
            <button
              type="button"
              onClick={() => setRoomAgain("no")}
              className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-body-sm font-medium transition-colors ${
                roomAgain === "no"
                  ? "border-accent bg-accent/10 text-accent font-semibold"
                  : "border-line bg-surface hover:bg-surface-sunken text-ink"
              }`}
            >
              <ThumbsDown className="size-4" />
              <span>No</span>
            </button>
          </div>
        </div>

        <div>
          <label className="text-body-xs font-semibold text-ink">
            Overall room experience (1 to 5)
          </label>
          <div className="mt-1.5 flex gap-2">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setScore(val)}
                className={`size-10 rounded-xl border text-body-sm font-semibold transition-colors ${
                  score === val
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-surface hover:bg-surface-sunken text-ink"
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-body-xs font-semibold text-ink">
            Highlights from living together
          </label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {TAG_OPTIONS.map((tag) => (
              <button
                key={tag.value}
                type="button"
                onClick={() => toggleTag(tag.value)}
                className={`rounded-full border px-3 py-1 text-caption font-medium transition-colors ${
                  selectedTags.includes(tag.value)
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-line bg-surface hover:bg-surface-sunken text-ink-2"
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-body-xs font-semibold text-ink">
            Biggest win or memorable memory (optional)
          </label>
          <input
            type="text"
            value={win}
            onChange={(e) => setWin(e.target.value)}
            placeholder="e.g. cooked dinners together every Sunday"
            className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-body-sm text-ink placeholder:text-ink-3"
            maxLength={200}
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-accent text-white hover:opacity-90"
          disabled={loading || !roomAgain}
        >
          {loading ? "Submitting..." : "Submit reflection"}
        </Button>
      </form>
    </div>
  );
}

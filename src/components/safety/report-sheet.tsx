"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle, ExternalLink, Phone, ShieldAlert } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { OptionCards } from "@/components/ui/choice";
import { reportUser } from "@/app/actions/social";
import { fileSeriousReport, getActiveEscalationRoutes } from "@/app/actions/safety";
import type { ReportReason } from "@/lib/options";
import {
  ESCALATION_CATEGORIES,
  NATIONAL_EMERGENCY_RESOURCES,
  resolveEscalationDestination,
  type EscalationCategory,
  type EscalationRoute,
} from "@/lib/safety/escalation";
import { LAUNCH_SCHOOL } from "@/lib/school";
import { useOptions, useT } from "@/components/providers/i18n";

type Reason = ReportReason;

const RESOURCE_KEY: Record<string, "emergency" | "crisis" | "rainn" | "dv"> = {
  "911 Emergency": "emergency",
  "988 Suicide & Crisis Lifeline": "crisis",
  "RAINN Sexual Assault Hotline": "rainn",
  "National Domestic Violence Hotline": "dv",
};

/** National lines that fit the category, always including 911. */
function resourcesFor(category: EscalationCategory | "") {
  const names: Record<EscalationCategory, string[]> = {
    harassment: [
      "911 Emergency",
      "RAINN Sexual Assault Hotline",
      "National Domestic Violence Hotline",
    ],
    threat: ["911 Emergency", "988 Suicide & Crisis Lifeline"],
    discrimination: ["911 Emergency"],
    wellbeing: ["988 Suicide & Crisis Lifeline", "911 Emergency"],
    general: ["911 Emergency"],
  };
  const wanted = category ? names[category] : ["911 Emergency", "988 Suicide & Crisis Lifeline"];
  return NATIONAL_EMERGENCY_RESOURCES.filter((r) => wanted.includes(r.name));
}

export function ReportSheet({
  open,
  onOpenChange,
  reportedId,
  firstName,
  messageId,
  conversationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedId: string;
  firstName: string;
  messageId?: string;
  conversationId?: string;
}) {
  const t = useT("safety");
  const { REPORT_REASONS } = useOptions();
  const [reason, setReason] = React.useState<Reason | "">("");
  const [isSerious, setIsSerious] = React.useState(false);
  const [seriousCategory, setSeriousCategory] = React.useState<EscalationCategory | "">("");
  const [consentForward, setConsentForward] = React.useState(false);
  const [blockUserNow, setBlockUserNow] = React.useState(false);
  const [details, setDetails] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [routes, setRoutes] = React.useState<EscalationRoute[]>([]);

  // Fetch active school routes on open
  React.useEffect(() => {
    if (open) {
      void getActiveEscalationRoutes().then((data) => setRoutes(data));
    }
  }, [open]);

  // When reason is safety or harassment, suggest serious path
  React.useEffect(() => {
    if (reason === "harassment") {
      setIsSerious(true);
      setSeriousCategory("harassment");
      setBlockUserNow(true);
    } else if (reason === "safety") {
      setIsSerious(true);
      setSeriousCategory("threat");
      setBlockUserNow(true);
    }
  }, [reason]);

  const activeDestination = seriousCategory
    ? resolveEscalationDestination(seriousCategory, routes)
    : null;

  async function submit() {
    if (!reason && !seriousCategory) {
      setError(t("report.choose"));
      return;
    }

    setPending(true);
    setError(null);

    let result;
    if (isSerious && seriousCategory) {
      result = await fileSeriousReport({
        reportedId,
        category: seriousCategory,
        reason: (reason as Reason) || "safety",
        details: details || undefined,
        messageId,
        conversationId,
        studentConsented: consentForward,
        blockUserNow,
      });
    } else {
      result = await reportUser({
        reportedId,
        reason: (reason as Reason) || "other",
        details: details || undefined,
        messageId,
        conversationId,
      });
    }

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onOpenChange(false);
    setReason("");
    setIsSerious(false);
    setSeriousCategory("");
    setConsentForward(false);
    setBlockUserNow(false);
    setDetails("");

    const forwardedTo =
      result.data && "forwardedTo" in result.data ? result.data.forwardedTo : null;
    const extraMsg = forwardedTo ? t("report.sentTo", { office: forwardedTo }) : "";

    toast.success(t("report.thanks"), {
      description: `${t("report.thanksBody", { name: firstName })}${extraMsg}`,
    });
  }

  const seriousOptions = ESCALATION_CATEGORIES.map((c) => ({
    value: c.key,
    label: t(`categories.${c.key}.label`),
    hint: t(`categories.${c.key}.description`),
  }));

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("report.title", { name: firstName })}
      description={t("report.description", {
        police: LAUNCH_SCHOOL.police.name,
        phone: LAUNCH_SCHOOL.police.phone,
      })}
      footer={
        <div className="flex w-full flex-col gap-2">
          <Button variant="danger" size="lg" block onClick={() => void submit()} loading={pending}>
            {isSerious && consentForward ? t("report.submitForward") : t("report.submit")}
          </Button>
          <p className="text-center text-caption text-ink-3">{t("report.disclaimer")}</p>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Serious Path Callout */}
        <div className="flex items-center justify-between rounded-xl border border-line bg-surface-sunken p-3.5">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-5 w-5 text-accent" />
            <div>
              <p className="text-body-sm font-semibold text-ink">{t("report.urgent")}</p>
              <p className="text-caption text-ink-3">{t("report.urgentHint")}</p>
            </div>
          </div>
          <Switch
            checked={isSerious}
            onCheckedChange={(checked) => {
              setIsSerious(checked);
              if (checked && !seriousCategory) setSeriousCategory("harassment");
            }}
            aria-label={t("report.urgentToggle")}
          />
        </div>

        {isSerious ? (
          /* Serious Escalation Form */
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-caption font-semibold text-ink">{t("report.category")}</label>
              <OptionCards
                aria-label={t("report.categoryAria")}
                value={seriousCategory}
                onValueChange={(v) => {
                  setSeriousCategory(v as EscalationCategory);
                  setError(null);
                }}
                options={seriousOptions}
                className="mt-2"
              />
            </div>

            {/* Destination Resolution & Disclaimer */}
            <div className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
                <div className="flex-1 text-caption text-ink">
                  {activeDestination ? (
                    <div>
                      <p className="font-semibold text-ink">{t("report.destination")}</p>
                      <p className="mt-0.5 font-medium text-ink">
                        {activeDestination.destinationLabel}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3 text-caption text-ink-2">
                        {activeDestination.phone ? (
                          <a
                            href={`tel:${activeDestination.phone}`}
                            className="inline-flex items-center gap-1 text-ink underline"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {activeDestination.phone}
                          </a>
                        ) : null}
                        {activeDestination.url ? (
                          <a
                            href={activeDestination.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-ink underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {t("report.reportingPage")}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-ink">{t("report.contacts")}</p>
                      <p className="mt-1 text-ink-2">{t("report.noRoute")}</p>
                      <div className="mt-2 space-y-1.5">
                        {resourcesFor(seriousCategory).map((r) => (
                          <div
                            key={r.name}
                            className="flex items-center justify-between text-body-sm"
                          >
                            <span className="font-medium text-ink">
                              {RESOURCE_KEY[r.name]
                                ? t(`resources.${RESOURCE_KEY[r.name]!}`)
                                : r.name}
                            </span>
                            <a
                              href={`tel:${r.phone}`}
                              className="font-semibold text-accent-ink underline"
                            >
                              {r.phone}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Student Consent Toggle */}
              {activeDestination ? (
                <div className="mt-3.5 flex items-center justify-between border-t border-line pt-3">
                  <div className="pr-3">
                    <p className="text-body-sm font-medium text-ink">
                      {t("report.sendTo", { office: activeDestination.destinationLabel })}
                    </p>
                    <p className="text-caption text-ink-3">
                      {activeDestination.email
                        ? t("report.sendToEmail")
                        : t("report.sendToNoEmail")}
                    </p>
                  </div>
                  <Switch
                    disabled={!activeDestination.email}
                    checked={consentForward}
                    onCheckedChange={setConsentForward}
                    aria-label={t("report.forwardAria", {
                      office: activeDestination.destinationLabel,
                    })}
                  />
                </div>
              ) : null}
            </div>

            {/* Immediate Block Option */}
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface-sunken p-3">
              <div className="pr-3">
                <p className="text-body-sm font-medium text-ink">
                  {t("report.blockNow", { name: firstName })}
                </p>
                <p className="text-caption text-ink-3">{t("report.blockNowHint")}</p>
              </div>
              <Switch
                checked={blockUserNow}
                onCheckedChange={setBlockUserNow}
                aria-label={t("report.blockAria", { name: firstName })}
              />
            </div>
          </div>
        ) : (
          /* Standard Report Reason Options */
          <div>
            <label className="text-caption font-semibold text-ink">{t("report.reason")}</label>
            <OptionCards
              aria-label={t("report.reason")}
              value={reason}
              onValueChange={(v) => {
                setReason(v);
                setError(null);
              }}
              options={REPORT_REASONS}
              columns={2}
              className="mt-2 grid-cols-1 sm:grid-cols-2"
            />
          </div>
        )}

        {/* Optional Details Textarea */}
        <div>
          <label className="text-caption font-semibold text-ink">{t("report.details")}</label>
          <Textarea
            aria-label={t("report.detailsAria")}
            placeholder={t("report.detailsPlaceholder")}
            rows={3}
            maxLength={1000}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="mt-1.5"
          />
        </div>

        {error ? (
          <p role="alert" className="text-body-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}

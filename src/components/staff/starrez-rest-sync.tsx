"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, CheckCircle2, AlertCircle, Copy, UploadCloud, Link as LinkIcon } from "lucide-react";
import {
  testStarRezConnection,
  syncStarRezGroups,
  pullStarRezAssignments,
  importQuestionnaireCsv,
} from "@/app/actions/starrez";
import { generatePortalEmbedSnippet, buildDeepLink } from "@/lib/integrations/attribution";

export function StarRezRestSync({ schoolId }: { schoolId: string }) {
  const [testing, setTesting] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [pulling, setPulling] = React.useState(false);
  const [connectionStatus, setConnectionStatus] = React.useState<{ ok: boolean; message: string } | null>(null);

  // Questionnaire upload
  const [csvText, setCsvText] = React.useState("");
  const [importing, setImporting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function handleTest() {
    setTesting(true);
    setConnectionStatus(null);
    try {
      const res = await testStarRezConnection(schoolId);
      setConnectionStatus({ ok: res.ok, message: res.message });
      if (res.ok) {
        toast.success("StarRez REST connection active");
      } else {
        toast.error(res.message);
      }
    } catch {
      setConnectionStatus({ ok: false, message: "Connection request failed" });
      toast.error("Connection failed");
    } finally {
      setTesting(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await syncStarRezGroups(schoolId);
      if (res.success) {
        toast.success(`Successfully pushed ${res.recordsPushed} groups to StarRez`);
      } else if (res.recordsPushed > 0) {
        toast.warning(`Pushed ${res.recordsPushed} groups with ${res.errors.length} errors`);
      } else {
        toast.error(res.errors[0]?.error || "Sync failed");
      }
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handlePull() {
    setPulling(true);
    try {
      const res = await pullStarRezAssignments(schoolId);
      if (res.ok) {
        toast.success(`Pulled ${res.count} assignments from StarRez`);
      } else {
        toast.error("Failed to pull assignments");
      }
    } catch {
      toast.error("Pull failed");
    } finally {
      setPulling(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      setCsvText(content);
    };
    reader.readAsText(file);
  }

  async function handleImportQuestionnaire() {
    if (!csvText.trim()) {
      toast.error("Please select or paste CSV text first.");
      return;
    }
    setImporting(true);
    try {
      const res = await importQuestionnaireCsv(schoolId, csvText);
      if (res.ok) {
        toast.success(`Imported ${res.imported} answers (${res.unmapped} unmapped)`);
        setCsvText("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        toast.error(res.error || "Import failed");
      }
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  }

  const portalLink = buildDeepLink(schoolId, "starrez");
  const embedSnippet = generatePortalEmbedSnippet(schoolId);

  return (
    <div className="flex flex-col gap-8 pt-4">
      {/* REST API Sync Section */}
      <section className="flex flex-col gap-4 rounded-xl bg-surface p-6 shadow-xs ring-1 ring-line">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-title font-semibold text-ink">StarRez REST API Sync</h2>
            <p className="mt-0.5 text-body-sm text-ink-2">
              Automated two-way integration with StarRez REST API: push confirmed groups and pull room assignments.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" loading={testing} onClick={handleTest}>
              Test Connection
            </Button>
            <Button variant="secondary" loading={pulling} onClick={handlePull}>
              <RefreshCw className="size-4 mr-1.5" /> Pull Assignments
            </Button>
            <Button loading={syncing} onClick={handleSync}>
              Push to StarRez
            </Button>
          </div>
        </div>

        {connectionStatus && (
          <div
            className={`flex items-center gap-2.5 p-3 rounded-lg text-body-sm ${
              connectionStatus.ok
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
                : "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800"
            }`}
          >
            {connectionStatus.ok ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-amber-600" />
            )}
            <span>{connectionStatus.message}</span>
          </div>
        )}
      </section>

      {/* Questionnaire Import Section */}
      <section className="flex flex-col gap-4 rounded-xl bg-surface p-6 shadow-xs ring-1 ring-line">
        <div>
          <h2 className="text-title font-semibold text-ink">StarRez Questionnaire Import</h2>
          <p className="mt-0.5 text-body-sm text-ink-2">
            Import student lifestyle answers from StarRez roommate-preference profiles to prefill Rumi onboarding.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            className="flex-1"
          />
          <Button
            variant="secondary"
            loading={importing}
            disabled={!csvText.trim()}
            onClick={handleImportQuestionnaire}
          >
            <UploadCloud className="size-4 mr-1.5" /> Map & Import
          </Button>
        </div>
      </section>

      {/* Portal Embed & LMS Kit */}
      <section className="flex flex-col gap-4 rounded-xl bg-surface p-6 shadow-xs ring-1 ring-line">
        <div>
          <h2 className="text-title font-semibold text-ink">StarRez Portal & LMS Entry Points</h2>
          <p className="mt-0.5 text-body-sm text-ink-2">
            Place signed deep links and buttons inside the StarRez Resident Portal or Canvas course modules.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-caption font-medium text-ink-2">Portal Deep Link</label>
            <div className="mt-1 flex gap-2">
              <Input readOnly value={portalLink} className="font-mono text-body-sm" />
              <Button
                variant="secondary"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(portalLink);
                  toast.success("Link copied to clipboard");
                }}
              >
                <LinkIcon className="size-4" />
              </Button>
            </div>
          </div>

          <div>
            <label className="text-caption font-medium text-ink-2">Embeddable Portal Button Widget (HTML)</label>
            <div className="mt-1 flex gap-2">
              <textarea
                readOnly
                rows={4}
                value={embedSnippet}
                className="w-full rounded-md border border-line bg-canvas p-2.5 font-mono text-caption text-ink"
              />
              <Button
                variant="secondary"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(embedSnippet);
                  toast.success("Widget code copied to clipboard");
                }}
              >
                <Copy className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

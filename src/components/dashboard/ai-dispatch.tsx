"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { recommendedStatus } from "@/lib/ai/policy";
import type { RankItem, TriageResult } from "@/lib/ai/types";
import type { Report, ReportStatus } from "@/lib/types";

type Props = {
  report: Report;
  queue: Report[];
  rank?: RankItem;
  onUseDraft: (text: string) => void;
  onSuggestStatus: (status: ReportStatus) => void;
};

const CREW: Record<NonNullable<RankItem["crew"]>, string> = {
  roads: "Roads",
  town_public_works: "Public works",
  environment: "Environment",
  accessibility: "Accessibility",
  other: "Unassigned",
};

function actionButton(action: RankItem["action"], current: ReportStatus) {
  if (action === "close_not_ours") return "Prepare close";
  if (action === "dispatch") return "Prepare dispatch";
  if (action === "follow_up") return "Prepare follow-up";
  if (action === "request_info") return "Prepare ask";
  if (current === "In Progress") return "Prepare note";
  return "Prepare hold note";
}

export function AiDispatch({
  report,
  queue,
  rank,
  onUseDraft,
  onSuggestStatus,
}: Props) {
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(!rank);
  const [error, setError] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);

  useEffect(() => {
    if (report.status === "Resolved") return;
    if (rank) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch("/api/ai/triage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ report, queue }),
        });
        const body = (await res.json()) as TriageResult & { error?: string };
        if (!res.ok) throw new Error(body.error || "Triage failed");
        if (!cancelled) setTriage(body);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Triage failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.id, report.status, rank?.id, rank?.action]);

  if (report.status === "Resolved") {
    return (
      <section className="rounded-2xl border border-[#E6F4F1] bg-[#F4FAF8] px-3.5 py-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[#0F766E]">
          <CheckCircle2 className="size-4 shrink-0 text-[#0F766E]" />
          <span>Report Resolved & Closed</span>
        </div>
        <p className="mt-1 text-[12px] leading-snug text-[#757575]">
          This ticket is completed. Jev AI recommendations and next steps are disabled for resolved reports.
        </p>
      </section>
    );
  }

  const action = rank?.action ?? triage?.action.value ?? "hold";
  const why =
    rank?.why ??
    (triage?.gisInTownship
      ? `${report.status} · ${triage.urgency.label} · ${CREW[triage.crew.value]}`
      : "Outside Plainsboro — close it and point the citizen to the right town.");
  const status = recommendedStatus(action, report.status);
  const statusChanges = status !== report.status;

  async function prepare() {
    if (drafting) return;
    setDrafting(true);
    setError(null);
    try {
      const payloadTriage =
        triage ??
        ({
          engine: "jev",
          crew: { value: rank?.crew ?? "other", confidence: 1 },
          urgency: {
            level: rank?.severity ?? 0,
            label: rank?.severityLabel ?? "Low",
            confidence: 1,
          },
          inTownship: {
            probability: rank?.gisInTownship ? 1 : 0,
            confidence: 1,
          },
          safetyHazard: { probability: 0, confidence: 0 },
          likelyDuplicate: { probability: 0, confidence: 0 },
          action: { value: action, confidence: 1 },
          gisInTownship: rank?.gisInTownship ?? false,
          jurisdiction: rank?.gisInTownship ? "in" : "out",
          needsHuman: false,
          recommendedStatus: status,
          nearby: [],
        } satisfies TriageResult);
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report, triage: payloadTriage, kind: "comment" }),
      });
      const body = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(body.error || "Draft failed");
      if (body.text) onUseDraft(body.text);
      onSuggestStatus(status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setDrafting(false);
    }
  }

  return (
    <section className="rounded-2xl bg-[#F7F8FA] px-3 py-3">
      <p className="mb-2 text-[12px] text-[#757575]">What to do</p>
      {loading ? (
        <p className="text-[13px] text-[#757575]">Ranking this report…</p>
      ) : error ? (
        <p className="text-[13px] text-[#757575]">{error}</p>
      ) : (
        <>
          <p className="text-[14px] leading-snug font-medium text-[#111827]">
            {why}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={drafting}
              onClick={() => void prepare()}
              className="rounded-full bg-[#111827] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
            >
              {drafting ? "Preparing…" : actionButton(action, report.status)}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-[#9CA3AF]">
            {statusChanges
              ? `Fills the note and sets status to ${status}. Nothing posts until you confirm.`
              : `Fills the note. Status stays ${report.status}. Nothing posts until you confirm.`}
          </p>
        </>
      )}
    </section>
  );
}

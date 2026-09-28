import type { DraftKind, DraftResult, TriageResult } from "@/lib/ai/types";
import { reportTitle } from "@/lib/format";
import type { Report } from "@/lib/types";

const CREW_LABEL: Record<TriageResult["crew"]["value"], string> = {
  roads: "Roads",
  town_public_works: "Public works",
  environment: "Environment",
  accessibility: "Accessibility",
  other: "Unassigned",
};

const ACTION_LABEL: Record<TriageResult["action"]["value"], string> = {
  dispatch: "dispatch a crew and move this Open ticket to In Progress",
  follow_up: "follow up on a ticket already In Progress — do not re-dispatch",
  request_info: "ask the citizen for more detail without changing status",
  close_not_ours: "close as not Plainsboro jurisdiction",
  hold: "keep the current status without dispatching",
};

export function isOpenRouterConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

export async function draftFromTriage(
  report: Report,
  triage: TriageResult,
  kind: DraftKind
): Promise<DraftResult> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  const model =
    process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4.1-mini";
  if (!key) {
    return { kind, text: localDraft(report, triage, kind), model: "local" };
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://streetsync.app",
      "X-Title": "StreetSync Municipal Ops",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 280,
      messages: [
        {
          role: "system",
          content:
            "You write short notes for Plainsboro Township, NJ municipal operators. System 1 already decided crew, urgency, jurisdiction, and action. Do not change those decisions. Do not invent facts, streets, or laws. 2–4 sentences. No greeting. No markdown.",
        },
        {
          role: "user",
          content: [
            `Write a ${kind === "work_order" ? "work-order body" : "staff status comment"}.`,
            `Title: ${reportTitle(report)}`,
            `Citizen: ${report.description}`,
            `Location: ${report.location} (${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)})`,
            `Current status: ${report.status}`,
            `Recommended next status: ${triage.recommendedStatus}`,
            `GIS in Plainsboro: ${triage.gisInTownship}`,
            `System 1 crew: ${CREW_LABEL[triage.crew.value]}`,
            `Urgency: ${triage.urgency.label}`,
            `Action: ${ACTION_LABEL[triage.action.value]}`,
            `Jurisdiction: ${triage.jurisdiction}`,
            triage.nearby[0]
              ? `Nearby: #${triage.nearby[0].id} ${triage.nearby[0].status} ${triage.nearby[0].meters}m`
              : "Nearby: none",
            report.status === "In Progress"
              ? "Write as a follow-up on work already underway. Do not sound like a first dispatch."
              : "Write as the first operator decision on an Open ticket.",
          ].join("\n"),
        },
      ],
    }),
  });

  const body = (await res.json().catch(() => null)) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  } | null;

  if (!res.ok) {
    throw new Error(body?.error?.message || `OpenRouter failed (${res.status})`);
  }

  const text = body?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenRouter returned an empty draft");
  return { kind, text, model };
}

function localDraft(report: Report, triage: TriageResult, kind: DraftKind) {
  const loc = report.location || "the reported location";
  if (triage.action.value === "close_not_ours" || triage.jurisdiction === "out") {
    return `This report does not appear to be in Plainsboro Township (${loc}). Closing as outside our jurisdiction. Please file with the municipality that owns this street.`;
  }
  if (triage.likelyDuplicate.probability >= 0.55 && triage.nearby[0]) {
    return `Possible duplicate of #${triage.nearby[0].id} (${triage.nearby[0].meters}m). Hold until field check confirms it is a separate defect.`;
  }
  if (kind === "work_order") {
    return `${CREW_LABEL[triage.crew.value]} — ${triage.urgency.label}. ${report.description} Location: ${loc}.`;
  }
  if (triage.action.value === "dispatch") {
    return `Routing to ${CREW_LABEL[triage.crew.value]} (${triage.urgency.label}). Moving this from Open to In Progress. ${triage.safetyHazard.probability >= 0.55 ? "Treat as a safety/access hazard until cleared." : "Schedule in the normal queue."}`;
  }
  if (triage.action.value === "follow_up") {
    return `${CREW_LABEL[triage.crew.value]} is already on this (${report.status}). ${triage.urgency.label} — check progress, do not open a second dispatch.`;
  }
  if (triage.action.value === "request_info") {
    return `Need a clearer photo or pin before dispatch. Location on file: ${loc}.`;
  }
  return `Holding in queue. ${CREW_LABEL[triage.crew.value]}, ${triage.urgency.label}.`;
}

import { reportTitle, shortLocation } from "@/lib/format";
import { actionForCurrentStatus, policyTriage } from "@/lib/ai/policy";
import { gisInTownship } from "@/lib/ai/geo";
import {
  isSystemOneConfigured,
  choiceValue,
  predictSystemOne,
} from "@/lib/ai/systemone";
import { SEVERITY_LABELS, triageReport } from "@/lib/ai/triage";
import type { Report } from "@/lib/types";
import type { RankItem, RankResult } from "@/lib/ai/types";

const CREW_SHORT: Record<RankItem["crew"], string> = {
  roads: "Roads",
  town_public_works: "Public works",
  environment: "Environment",
  accessibility: "Accessibility",
  other: "Unassigned",
};

export function explainRank(item: RankItem) {
  if (!item.gisInTownship) {
    return "Outside Plainsboro — close it and point the citizen to the right town.";
  }
  if (item.action === "close_not_ours") {
    return "Not a Plainsboro job — close as not ours.";
  }
  if (item.status === "In Progress") {
    if (item.action === "request_info") {
      return "Crew is already on this, but we still need a clearer photo or pin.";
    }
    if (item.severity === 2) {
      return `${CREW_SHORT[item.crew]} is already on this High item — follow up today, do not re-dispatch.`;
    }
    return `${CREW_SHORT[item.crew]} already has this. Leave it In Progress and pick an Open report next.`;
  }
  if (item.action === "request_info") {
    return "Still Open — need a clearer photo or pin before a crew can go.";
  }
  if (item.action === "hold") {
    return "Keep this Open. Do not dispatch yet.";
  }
  if (item.action === "follow_up") {
    return `Follow up with ${CREW_SHORT[item.crew]}. Status stays In Progress.`;
  }
  if (item.severity === 2) {
    return `Still Open — send ${CREW_SHORT[item.crew]} today and mark In Progress.`;
  }
  if (item.severity === 1) {
    return `Still Open — schedule ${CREW_SHORT[item.crew]} this week.`;
  }
  return `Still Open — low priority for ${CREW_SHORT[item.crew]}.`;
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }
  const n = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

export async function rankQueue(reports: Report[]): Promise<RankResult> {
  const open = reports.filter((r) => !r.isDraft && r.status !== "Resolved").slice(0, 15);

  const items = await mapPool(open, 3, async (report) => {
    const triage = isSystemOneConfigured()
      ? await triageReport(report, reports)
      : policyTriage(report, reports);
    const gis = gisInTownship(report);
    const action = actionForCurrentStatus(
      gis ? triage.action.value : "close_not_ours",
      report.status,
      gis
    );
    const severity = gis ? triage.urgency.level : 0;
    const item: RankItem = {
      id: report.id,
      status: report.status,
      severity,
      severityLabel: SEVERITY_LABELS[severity],
      action,
      crew: triage.crew.value,
      inTownship: triage.jurisdiction === "in",
      gisInTownship: gis,
      why: "",
    };
    item.why = explainRank(item);
    return item;
  });

  const candidates = items.filter(
    (item) => item.gisInTownship && item.action !== "close_not_ours"
  );
  const pickFrom = (candidates.length ? candidates : items).slice(0, 8);
  const heuristicNext = pickFrom.length
    ? [...pickFrom].sort(compareRanked)[0].id
    : null;
  let nextId: number | null = heuristicNext;

  if (isSystemOneConfigured() && pickFrom.length > 1) {
    const criteria: Record<string, string> = {};
    for (const item of pickFrom) {
      const report = reports.find((r) => r.id === item.id);
      if (!report) continue;
      criteria[`id_${item.id}`] =
        `${item.severityLabel} · ${report.status} · ${CREW_SHORT[item.crew]} · ${reportTitle(report)} @ ${shortLocation(report.location)} · ${item.why}`;
    }
    try {
      const result = await predictSystemOne(
        {
          job: "Pick the single Plainsboro report the operator should work first.",
          rule: "Prefer Open in-township reports that still need a first decision. Prefer High over Medium over Low. Do not pick In Progress if an Open High or Medium in-town report exists. Only pick In Progress when it is High and looks stalled, or when nothing Open remains. Never pick an out-of-town pin if an in-town option exists.",
        },
        {
          next: {
            type: "choice",
            instructions:
              "Which report should the operator open first right now? Open beats In Progress at the same severity.",
            criteria,
          },
        }
      );
      const picked = choiceValue(result.answers?.next, "");
      const match = picked.match(/(\d+)/);
      if (match) nextId = Number(match[1]);
    } catch {
      // keep heuristic nextId
    }
  }

  return {
    engine: isSystemOneConfigured() ? "jev" : "plainsboro-gis",
    nextId,
    items,
  };
}

function statusRank(status: RankItem["status"] | undefined) {
  if (status === "Open") return 2;
  if (status === "In Progress") return 1;
  return 0;
}

export function compareRanked(a: RankItem | undefined, b: RankItem | undefined) {
  const as = a ? (a.gisInTownship ? 1 : 0) : 0;
  const bs = b ? (b.gisInTownship ? 1 : 0) : 0;
  if (as !== bs) return bs - as;
  const av = a?.severity ?? -1;
  const bv = b?.severity ?? -1;
  if (av !== bv) return bv - av;
  return statusRank(b?.status) - statusRank(a?.status);
}

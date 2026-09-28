import { reportTitle } from "@/lib/format";
import { gisInTownship, nearbyReports } from "@/lib/ai/geo";
import type { Report, ReportStatus } from "@/lib/types";
import type {
  DispatchAction,
  DispatchCrew,
  TriageResult,
} from "@/lib/ai/types";

export function actionForCurrentStatus(
  action: DispatchAction,
  status: ReportStatus,
  gis: boolean
): DispatchAction {
  if (!gis) return "close_not_ours";
  if (status === "In Progress" && action === "dispatch") return "follow_up";
  if (status === "Open" && action === "follow_up") return "dispatch";
  return action;
}

export function recommendedStatus(
  action: DispatchAction,
  current: ReportStatus
): ReportStatus {
  if (action === "close_not_ours") return "Resolved";
  if (action === "dispatch" || action === "follow_up") return "In Progress";
  if (current === "In Progress") return "In Progress";
  if (current === "Resolved") return "Resolved";
  return "Open";
}

function statusMeans(status: ReportStatus) {
  if (status === "Open") {
    return "Nobody has taken this yet. First decision still needed.";
  }
  if (status === "In Progress") {
    return "A crew is already assigned. Do not treat as a new dispatch.";
  }
  return "Already closed.";
}

const SEVERITY_LABELS = ["Low", "Medium", "High"] as const;

function crewFromCategory(category: string): DispatchCrew {
  const key = category.toLowerCase();
  if (key.includes("road") || key.includes("pothole")) return "roads";
  if (key.includes("access") || key.includes("sidewalk") || key.includes("curb")) {
    return "accessibility";
  }
  if (key.includes("environ") || key.includes("drain") || key.includes("flood")) {
    return "environment";
  }
  if (key.includes("public") || key.includes("town")) return "town_public_works";
  return "other";
}

export function policyTriage(report: Report, queue: Report[]): TriageResult {
  const gis = gisInTownship(report);
  const nearby = nearbyReports(report, queue);
  const text = `${report.title ?? ""} ${report.description} ${report.location}`.toLowerCase();
  const otherTown =
    /west windsor|princeton|south brunswick|east windsor|cranbury|san francisco|new york/.test(
      text
    );
  const hazard =
    /blocked ramp|wheelchair|trip hazard|spanning|standing water|no alternate|collapse|open hole/.test(
      text
    );
  const urgentWord = /blocked|hazard|flood|school crossing|can't pass|cannot pass/.test(
    text
  );
  const duplicate = nearby.some(
    (n) => n.meters < 80 && n.category === report.category
  );

  const crew = crewFromCategory(report.category);
  const urgencyLevel: 0 | 1 | 2 = hazard || urgentWord ? 2 : otherTown ? 0 : 1;
  let action: DispatchAction = "hold";
  if (!gis || otherTown) action = "close_not_ours";
  else if (report.status === "In Progress") action = "follow_up";
  else if (duplicate) action = "hold";
  else if (hazard || urgentWord) action = "dispatch";
  else if (report.description.trim().length < 20) action = "request_info";
  else action = "dispatch";
  action = actionForCurrentStatus(action, report.status, gis);

  return {
    engine: "plainsboro-gis",
    crew: { value: crew, confidence: 0.72 },
    urgency: {
      level: urgencyLevel,
      label: SEVERITY_LABELS[urgencyLevel],
      confidence: 0.7,
    },
    inTownship: { probability: gis ? 0.96 : 0.08, confidence: 0.95 },
    safetyHazard: { probability: hazard ? 0.86 : 0.18, confidence: 0.7 },
    likelyDuplicate: { probability: duplicate ? 0.8 : 0.12, confidence: 0.75 },
    action: { value: action, confidence: 0.78 },
    gisInTownship: gis,
    jurisdiction: gis ? "in" : "out",
    needsHuman: Boolean(otherTown && gis),
    recommendedStatus: recommendedStatus(action, report.status),
    nearby,
  };
}

export function compactState(report: Report, queue: Report[]) {
  const gis = gisInTownship(report);
  const nearby = nearbyReports(report, queue);
  const queueOpen = queue.filter((r) => !r.isDraft && r.status === "Open").length;
  const queueInProgress = queue.filter(
    (r) => !r.isDraft && r.status === "In Progress"
  ).length;
  return {
    township: "Plainsboro Township, NJ",
    gis_in_township: gis,
    report_id: report.id,
    category: report.category,
    location: report.location,
    coordinates: `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`,
    current_status: report.status,
    status_means: statusMeans(report.status),
    opened_at: report.time,
    title: reportTitle(report),
    description: report.description.slice(0, 800),
    queue_open_count: queueOpen,
    queue_in_progress_count: queueInProgress,
    nearby:
      nearby.length === 0
        ? "none"
        : nearby
            .map(
              (n) =>
                `#${n.id} ${n.status} ${n.category} ${n.meters}m: ${n.title} @ ${n.location}`
            )
            .join(" | "),
  };
}

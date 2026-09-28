import { gisInTownship, nearbyReports } from "@/lib/ai/geo";
import {
  actionForCurrentStatus,
  compactState,
  policyTriage,
  recommendedStatus,
} from "@/lib/ai/policy";
import {
  answerConfidence,
  choiceValue,
  isSystemOneConfigured,
  noulValue,
  predictSystemOne,
  scoreLevel,
} from "@/lib/ai/systemone";
import type { Report } from "@/lib/types";
import type {
  DispatchAction,
  DispatchCrew,
  TriageResult,
} from "@/lib/ai/types";

export const CREWS: DispatchCrew[] = [
  "roads",
  "town_public_works",
  "environment",
  "accessibility",
  "other",
];

export const ACTIONS: DispatchAction[] = [
  "dispatch",
  "follow_up",
  "request_info",
  "close_not_ours",
  "hold",
];

export const SEVERITY_LABELS = ["Low", "Medium", "High"] as const;

export function asCrew(value: string): DispatchCrew {
  return CREWS.includes(value as DispatchCrew) ? (value as DispatchCrew) : "other";
}

export function asAction(value: string): DispatchAction {
  return ACTIONS.includes(value as DispatchAction)
    ? (value as DispatchAction)
    : "hold";
}

export async function triageReport(
  report: Report,
  queue: Report[] = []
): Promise<TriageResult> {
  const gis = gisInTownship(report);
  const nearby = nearbyReports(report, queue);

  if (!isSystemOneConfigured()) {
    return policyTriage(report, queue);
  }

  const result = await predictSystemOne(compactState(report, queue));
  const answers = result.answers ?? {};
  const crew = asCrew(choiceValue(answers.crew, "other"));
  const actionRaw = asAction(
    choiceValue(answers.next_action, choiceValue(answers.suggested_action, "hold"))
  );
  const action = actionForCurrentStatus(actionRaw, report.status, gis);
  const severity = scoreLevel(answers.severity ?? answers.urgency);
  const inTownshipP = noulValue(answers.in_township);
  const modelSaysIn = inTownshipP >= 0.5;
  let jurisdiction: TriageResult["jurisdiction"] = gis ? "in" : "out";
  if (gis !== modelSaysIn) jurisdiction = "conflict";

  const needsHuman =
    jurisdiction === "conflict" ||
    noulValue(answers.likely_duplicate) >= 0.55;

  return {
    engine: "jev",
    routingModel: result.model ?? "typesafe/jev-1.13",
    crew: { value: crew, confidence: answerConfidence(answers.crew) },
    urgency: {
      level: severity,
      label: SEVERITY_LABELS[severity],
      confidence: answerConfidence(answers.severity ?? answers.urgency),
    },
    inTownship: {
      probability: inTownshipP,
      confidence: answerConfidence(answers.in_township),
    },
    safetyHazard: {
      probability: severity === 2 ? 0.8 : noulValue(answers.safety_hazard),
      confidence: 0,
    },
    likelyDuplicate: {
      probability: noulValue(answers.likely_duplicate),
      confidence: answerConfidence(answers.likely_duplicate),
    },
    action: {
      value: action,
      confidence: answerConfidence(answers.next_action ?? answers.suggested_action),
    },
    gisInTownship: gis,
    jurisdiction,
    needsHuman,
    recommendedStatus: recommendedStatus(action, report.status),
    nearby,
  };
}

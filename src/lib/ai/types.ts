import type { ReportStatus } from "@/lib/types";

export type AiEngine = "laya" | "jev" | "plainsboro-gis";

export type DispatchCrew =
  | "roads"
  | "town_public_works"
  | "environment"
  | "accessibility"
  | "other";

export type DispatchAction =
  | "dispatch"
  | "follow_up"
  | "request_info"
  | "close_not_ours"
  | "hold";

export type NearbyReport = {
  id: number;
  title: string;
  category: string;
  location: string;
  status: ReportStatus;
  meters: number;
};

export type TriageResult = {
  engine: AiEngine;
  routingModel?: string;
  crew: { value: DispatchCrew; confidence: number };
  urgency: { level: 0 | 1 | 2; label: string; confidence: number };
  inTownship: { probability: number; confidence: number };
  safetyHazard: { probability: number; confidence: number };
  likelyDuplicate: { probability: number; confidence: number };
  action: { value: DispatchAction; confidence: number };
  gisInTownship: boolean;
  jurisdiction: "in" | "out" | "conflict";
  needsHuman: boolean;
  recommendedStatus: ReportStatus;
  nearby: NearbyReport[];
};

export type DraftKind = "comment" | "work_order";

export type DraftResult = {
  kind: DraftKind;
  text: string;
  model: string;
};

export type SeverityLabel = "Low" | "Medium" | "High";

export type RankItem = {
  id: number;
  status: ReportStatus;
  severity: 0 | 1 | 2;
  severityLabel: SeverityLabel;
  action: DispatchAction;
  crew: DispatchCrew;
  inTownship: boolean;
  gisInTownship: boolean;
  why: string;
};

export type RankResult = {
  engine: AiEngine;
  nextId: number | null;
  items: RankItem[];
};

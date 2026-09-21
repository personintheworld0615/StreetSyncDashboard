export type ReportStatus = "Open" | "In Progress" | "Resolved";
export type ReportSeverity = "low" | "medium" | "high";

export type Report = {
  id: number;
  title?: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  location: string;
  image?: string | null;
  time: string;
  severity: ReportSeverity;
  status: ReportStatus;
  user_id: number;
  isDraft: boolean;
  /** Synthetic demo data for the App Challenge console */
  synthetic?: boolean;
};

export type StatusFilter = "all" | ReportStatus;
export type ViewMode = "map" | "list";
export type MapMode = "pins" | "heatmap";

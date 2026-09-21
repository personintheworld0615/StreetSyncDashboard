import type { Report, ReportSeverity, ReportStatus } from "@/lib/types";

/** Row shape from Supabase `reports` table (SQLAlchemy / Postgres). */
export type DbReport = {
  id: number;
  title?: string | null;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  location: string;
  image?: string | null;
  severity: string;
  status: string;
  is_draft: boolean;
  time: string;
  user_id: number;
};

const VALID_STATUS: ReportStatus[] = ["Open", "In Progress", "Resolved"];

export function normalizeStatus(raw: string): ReportStatus {
  const s = raw.trim();
  if (s === "In Progress") return "In Progress";
  if (s === "Resolved" || s === "Closed") return "Resolved";
  return "Open";
}

function normalizeSeverity(raw: string): ReportSeverity {
  const s = raw.trim().toLowerCase();
  if (s === "high" || s === "medium" || s === "low") return s;
  return "medium";
}

export function mapDbReport(row: DbReport): Report {
  return {
    id: row.id,
    title: row.title?.trim() || undefined,
    description: row.description,
    category: row.category,
    latitude: row.latitude,
    longitude: row.longitude,
    location: row.location,
    image: row.image,
    time: row.time,
    severity: normalizeSeverity(row.severity),
    status: normalizeStatus(row.status),
    user_id: row.user_id,
    isDraft: row.is_draft,
    synthetic: false,
  };
}

export function isAllowedStatus(status: string): status is ReportStatus {
  return VALID_STATUS.includes(status as ReportStatus);
}

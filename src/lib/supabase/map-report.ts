import type { Report, ReportStatus, ReportUpdate } from "@/lib/types";

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
  status: string;
  is_draft: boolean;
  time: string;
  user_id: number;
};

/** Row shape from Supabase `updates` table. */
export type DbUpdate = {
  id: number;
  report_id: number;
  user_id: number;
  report_title?: string | null;
  old_status: string;
  new_status: string;
  comment?: string | null;
  is_read?: boolean | null;
  created_at: string;
};

const VALID_STATUS: ReportStatus[] = ["Open", "In Progress", "Pending", "Resolved"];

export const UPDATE_SELECT =
  "id, report_id, user_id, report_title, old_status, new_status, comment, is_read, created_at";

export const REPORT_SELECT =
  "id, title, description, category, latitude, longitude, location, image, status, is_draft, time, user_id";

export function normalizeStatus(raw: string): ReportStatus {
  const s = raw.trim();
  if (s === "In Progress") return "In Progress";
  if (s === "Pending") return "Pending";
  if (s === "Resolved" || s === "Closed") return "Resolved";
  return "Open";
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
    status: normalizeStatus(row.status),
    user_id: row.user_id,
    isDraft: row.is_draft,
    synthetic: false,
  };
}

export function mapDbUpdate(row: DbUpdate): ReportUpdate {
  return {
    id: row.id,
    report_id: row.report_id,
    user_id: row.user_id,
    report_title: row.report_title?.trim() || "",
    old_status: normalizeStatus(row.old_status),
    new_status: normalizeStatus(row.new_status),
    comment: row.comment?.trim() || null,
    is_read: Boolean(row.is_read),
    created_at: row.created_at,
  };
}

export function isAllowedStatus(status: string): status is ReportStatus {
  return VALID_STATUS.includes(status as ReportStatus);
}

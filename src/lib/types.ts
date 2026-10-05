export type ReportStatus = "Open" | "In Progress" | "Pending" | "Resolved";

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
  status: ReportStatus;
  user_id: number;
  isDraft: boolean;
  followUpAt?: string | null;
  /** Synthetic demo data for the App Challenge console */
  synthetic?: boolean;
};

/** Row from Supabase `updates` (status change and/or staff comment). */
export type ReportUpdate = {
  id: number;
  report_id: number;
  user_id: number;
  report_title: string;
  old_status: ReportStatus;
  new_status: ReportStatus;
  comment: string | null;
  is_read: boolean;
  created_at: string;
};

export type StatusFilter = "all" | ReportStatus;
import type { Report, ReportStatus } from "@/lib/types";

export function formatAgo(iso: string) {
  const parsed = new Date(iso);
  if (Number.isNaN(+parsed)) return "Recently";
  const diff = Date.now() - parsed.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function shortLocation(location: string) {
  const trimmed = location.trim();
  if (!trimmed) return "Unknown";
  const comma = trimmed.indexOf(",");
  if (comma > 0) return trimmed.slice(0, comma).trim();
  return trimmed;
}

export function statusLabel(status: ReportStatus) {
  if (status === "Resolved") return "Resolved";
  if (status === "In Progress") return "In progress";
  return "Open";
}

export function reportTitle(report: Report) {
  if (report.title?.trim()) return report.title.trim();
  const first = report.description.split(/[.!?]/)[0]?.trim();
  return first || report.category;
}

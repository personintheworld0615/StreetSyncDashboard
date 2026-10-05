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
  if (status === "Pending") return "Pending";
  return "Open";
}

export function reportTitle(report: Report) {
  if (report.title?.trim()) return report.title.trim();
  const first = report.description.split(/[.!?]/)[0]?.trim();
  return first || report.category;
}

export function formatFollowUp(iso: string): { label: string; isDue: boolean } {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { label: "Scheduled", isDue: false };
    const now = new Date();
    const isDue = d.getTime() <= now.getTime();

    const month = d.toLocaleDateString("en-US", { month: "short" });
    const day = d.getDate();
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    const dateStr = `${month} ${day}, ${h12}:${minutes} ${ampm}`;

    if (isDue) {
      return { label: `Due now (${dateStr})`, isDue: true };
    }
    return { label: dateStr, isDue: false };
  } catch {
    return { label: "Scheduled", isDue: false };
  }
}

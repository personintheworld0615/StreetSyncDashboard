import type { Report, ReportStatus } from "@/lib/types";

export async function fetchReports(): Promise<Report[]> {
  const res = await fetch("/api/reports", { cache: "no-store" });
  if (res.status === 503) {
    throw new Error("not_configured");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Failed to load reports (${res.status})`);
  }
  return res.json() as Promise<Report[]>;
}

export async function updateReportStatus(
  id: number,
  status: ReportStatus
): Promise<Report> {
  const res = await fetch(`/api/reports/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Failed to update status (${res.status})`);
  }

  return res.json() as Promise<Report>;
}

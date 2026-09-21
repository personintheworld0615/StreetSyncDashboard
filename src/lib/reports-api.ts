import type { Report, ReportStatus, ReportUpdate } from "@/lib/types";

export type StatusUpdateResult = {
  report: Report;
  update: ReportUpdate | null;
};

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

export async function fetchReportUpdates(reportId: number): Promise<ReportUpdate[]> {
  const res = await fetch(`/api/reports/${reportId}/updates`, { cache: "no-store" });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Failed to load updates (${res.status})`);
  }
  return res.json() as Promise<ReportUpdate[]>;
}

export async function postReportUpdate(
  id: number,
  payload: { status?: ReportStatus; comment?: string | null }
): Promise<StatusUpdateResult> {
  const res = await fetch(`/api/reports/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Failed to post update (${res.status})`);
  }

  return res.json() as Promise<StatusUpdateResult>;
}

export async function editReportUpdate(
  updateId: number,
  payload: { comment?: string | null; new_status?: ReportStatus }
): Promise<{ update: ReportUpdate; report: Report | null }> {
  const res = await fetch(`/api/updates/${updateId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Failed to edit update (${res.status})`);
  }

  return res.json() as Promise<{ update: ReportUpdate; report: Report | null }>;
}

export async function deleteReportUpdate(
  updateId: number
): Promise<{ ok: true; report: Report | null }> {
  const res = await fetch(`/api/updates/${updateId}`, { method: "DELETE" });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Failed to delete update (${res.status})`);
  }

  return res.json() as Promise<{ ok: true; report: Report | null }>;
}

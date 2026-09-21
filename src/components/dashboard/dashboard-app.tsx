"use client";

/**
 * THESIS: Desktop dispatch using StreetSync tokens — not a blown-up HomeScreen.
 * OWN-WORLD: #F7F8FA, charcoal actions, Inter, Nunito mark, capsule chips, divider rows.
 * STORY: Scan counts, filter the queue, locate on the map, update status.
 * FIRST VIEWPORT: Compact top bar + counts; queue list and map share the remaining height.
 * FORM: App scheme, desktop topology. Data: Supabase `reports` via /api routes.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { StatusMetrics } from "@/components/dashboard/status-metrics";
import { ReportsList } from "@/components/dashboard/reports-list";
import { ReportsMapLazy } from "@/components/dashboard/reports-map-lazy";
import { ReportDetail } from "@/components/dashboard/report-detail";
import {
  SYNTHETIC_REPORTS,
  countByStatus,
} from "@/lib/data/reports";
import { categoryLabel } from "@/lib/categories";
import {
  deleteReportUpdate,
  editReportUpdate,
  fetchReportUpdates,
  fetchReports,
  postReportUpdate,
} from "@/lib/reports-api";
import { reportTitle } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  Report,
  ReportStatus,
  ReportUpdate,
  StatusFilter,
} from "@/lib/types";

let demoUpdateSeq = 1000;

export function DashboardApp() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [updatesByReport, setUpdatesByReport] = useState<
    Record<number, ReportUpdate[]>
  >({});
  const [updatesLoading, setUpdatesLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await fetchReports();
      setReports(rows);
      setUsingDemo(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load reports";
      if (msg === "not_configured") {
        setReports(SYNTHETIC_REPORTS);
        setUsingDemo(true);
        setLoadError(null);
      } else {
        setReports(SYNTHETIC_REPORTS);
        setUsingDemo(true);
        setLoadError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => countByStatus(reports), [reports]);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(reports.map((r) => r.category)))],
    [reports]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports
      .filter((r) => !r.isDraft)
      .filter((r) => (statusFilter === "all" ? true : r.status === statusFilter))
      .filter((r) => (category === "all" ? true : r.category === category))
      .filter((r) => {
        if (!q) return true;
        return (
          r.description.toLowerCase().includes(q) ||
          (r.title?.toLowerCase().includes(q) ?? false) ||
          r.location.toLowerCase().includes(q) ||
          String(r.id).includes(q) ||
          r.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aResolved = a.status === "Resolved" ? 1 : 0;
        const bResolved = b.status === "Resolved" ? 1 : 0;
        if (aResolved !== bResolved) return aResolved - bResolved;
        return +new Date(b.time) - +new Date(a.time);
      });
  }, [reports, statusFilter, category, query]);

  const selected = reports.find((r) => r.id === selectedId) ?? null;
  const selectedUpdates =
    selectedId != null ? (updatesByReport[selectedId] ?? []) : [];

  const loadUpdates = useCallback(
    async (reportId: number) => {
      if (usingDemo) return;
      setUpdatesLoading(true);
      try {
        const rows = await fetchReportUpdates(reportId);
        setUpdatesByReport((prev) => ({ ...prev, [reportId]: rows }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not load updates";
        setLoadError(msg);
      } finally {
        setUpdatesLoading(false);
      }
    },
    [usingDemo]
  );

  useEffect(() => {
    if (selectedId == null) return;
    if (usingDemo) {
      setUpdatesByReport((prev) =>
        prev[selectedId] ? prev : { ...prev, [selectedId]: [] }
      );
      return;
    }
    void loadUpdates(selectedId);
  }, [selectedId, usingDemo, loadUpdates]);

  function applyReport(report: Report | null) {
    if (!report) return;
    setReports((prev) => prev.map((r) => (r.id === report.id ? report : r)));
  }

  function prependUpdate(reportId: number, update: ReportUpdate) {
    setUpdatesByReport((prev) => ({
      ...prev,
      [reportId]: [update, ...(prev[reportId] ?? [])],
    }));
  }

  async function handlePostUpdate(
    id: number,
    payload: { status?: ReportStatus; comment?: string | null }
  ) {
    const current = reports.find((r) => r.id === id);
    if (!current) return;

    const nextStatus = payload.status ?? current.status;
    const comment = payload.comment?.trim() || null;

    if (usingDemo) {
      const update: ReportUpdate = {
        id: ++demoUpdateSeq,
        report_id: id,
        user_id: current.user_id,
        report_title: reportTitle(current),
        old_status: current.status,
        new_status: nextStatus,
        comment,
        is_read: false,
        created_at: new Date().toISOString(),
      };
      applyReport({ ...current, status: nextStatus });
      prependUpdate(id, update);
      return;
    }

    setStatusSaving(true);
    try {
      const result = await postReportUpdate(id, payload);
      applyReport(result.report);
      if (result.update) prependUpdate(id, result.update);
      else await loadUpdates(id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not post update";
      setLoadError(msg);
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleEditUpdate(
    updateId: number,
    payload: { comment?: string | null; new_status?: ReportStatus }
  ) {
    if (selectedId == null) return;

    if (usingDemo) {
      setUpdatesByReport((prev) => {
        const list = prev[selectedId] ?? [];
        return {
          ...prev,
          [selectedId]: list.map((u) =>
            u.id === updateId
              ? {
                  ...u,
                  comment:
                    "comment" in payload
                      ? payload.comment?.trim() || null
                      : u.comment,
                  new_status: payload.new_status ?? u.new_status,
                }
              : u
          ),
        };
      });
      if (payload.new_status) {
        applyReport({
          ...(reports.find((r) => r.id === selectedId) as Report),
          status: payload.new_status,
        });
      }
      return;
    }

    setStatusSaving(true);
    try {
      const result = await editReportUpdate(updateId, payload);
      applyReport(result.report);
      setUpdatesByReport((prev) => ({
        ...prev,
        [selectedId]: (prev[selectedId] ?? []).map((u) =>
          u.id === updateId ? result.update : u
        ),
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not edit update";
      setLoadError(msg);
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleDeleteUpdate(updateId: number) {
    if (selectedId == null) return;

    if (usingDemo) {
      const list = updatesByReport[selectedId] ?? [];
      const target = list.find((u) => u.id === updateId);
      setUpdatesByReport((prev) => ({
        ...prev,
        [selectedId]: (prev[selectedId] ?? []).filter((u) => u.id !== updateId),
      }));
      if (target && target.old_status !== target.new_status) {
        const current = reports.find((r) => r.id === selectedId);
        if (current && current.status === target.new_status) {
          applyReport({ ...current, status: target.old_status });
        }
      }
      return;
    }

    setStatusSaving(true);
    try {
      const result = await deleteReportUpdate(updateId);
      applyReport(result.report);
      setUpdatesByReport((prev) => ({
        ...prev,
        [selectedId]: (prev[selectedId] ?? []).filter((u) => u.id !== updateId),
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not delete update";
      setLoadError(msg);
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="shrink-0 border-b border-[#E5E7EB] px-5 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 pr-2">
            <p className="font-display text-[22px] leading-none font-bold tracking-[0.8px] text-black">
              StreetSync
            </p>
            <p className="mt-1 text-[12px] text-[#757575]">
              Municipal ops · Plainsboro, NJ
              {usingDemo && " · demo data"}
            </p>
          </div>

          <StatusMetrics
            counts={counts}
            active={statusFilter}
            onSelect={setStatusFilter}
          />

          <label className="relative min-w-[200px] flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#757575]"
              aria-hidden
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reports, streets, IDs"
              aria-label="Search reports"
              className="h-10 w-full rounded-full bg-[#EEF0F3] pr-4 pl-9 text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF]"
            />
          </label>
        </div>

        {(loadError || usingDemo) && (
          <p className="mt-2 text-[12px] text-[#757575]">
            {loadError
              ? `${loadError} — showing demo queue.`
              : "Add .env.local with Supabase keys to load live reports."}
            {!usingDemo && (
              <button
                type="button"
                onClick={() => void load()}
                className="ml-2 underline hover:text-[#111827]"
              >
                Retry
              </button>
            )}
          </p>
        )}
      </header>

      <main className="flex min-h-0 flex-1">
        <section className="flex w-full min-w-0 max-w-[400px] shrink-0 flex-col border-r border-[#E5E7EB] bg-white lg:max-w-[380px]">
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-baseline justify-between gap-2">
              <h1 className="text-[18px] font-semibold tracking-[-0.3px] text-[#111827]">
                Reports
              </h1>
              <p className="text-[12px] text-[#757575]">
                {loading ? "Loading…" : `${filtered.length} in filter`}
              </p>
            </div>
            <div
              className="mt-3 flex gap-1 overflow-x-auto"
              role="tablist"
              aria-label="Category"
            >
              {categories.map((c) => {
                const selectedChip = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    role="tab"
                    aria-selected={selectedChip}
                    onClick={() => setCategory(c)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1.5 text-[13px] transition-colors duration-150",
                      selectedChip
                        ? "bg-[#E8EAED] font-semibold text-[#111827]"
                        : "font-normal text-[#757575] hover:text-[#111827]"
                    )}
                  >
                    {c === "all" ? "All" : categoryLabel(c)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="min-h-0 flex-1 px-2">
            {loading ? (
              <p className="px-2 py-8 text-sm text-[#757575]">Loading reports…</p>
            ) : (
              <ReportsList
                reports={filtered}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
          </div>
        </section>

        <section className="relative min-h-0 min-w-0 flex-1">
          <ReportsMapLazy
            reports={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </section>

        {selected && (
          <ReportDetail
            report={selected}
            updates={selectedUpdates}
            updatesLoading={updatesLoading}
            onClose={() => setSelectedId(null)}
            onPostUpdate={(payload) => handlePostUpdate(selected.id, payload)}
            onEditUpdate={handleEditUpdate}
            onDeleteUpdate={handleDeleteUpdate}
            saving={statusSaving}
          />
        )}
      </main>
    </div>
  );
}

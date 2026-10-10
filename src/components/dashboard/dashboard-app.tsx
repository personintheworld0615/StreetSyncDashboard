"use client";

/**
 * THESIS: Desktop dispatch using StreetSync tokens — not a blown-up HomeScreen.
 * OWN-WORLD: #F7F8FA, charcoal actions, Inter, Nunito mark, capsule chips, divider rows.
 * STORY: Scan counts, filter the queue, locate on the map, update status.
 * FIRST VIEWPORT: Compact top bar + counts; queue list and map share the remaining height.
 * FORM: App scheme, desktop topology. Data: Supabase `reports` via /api routes.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Clock, LogOut, RefreshCw, Search } from "lucide-react";
import { StatusMetrics } from "@/components/dashboard/status-metrics";
import { ReportsList } from "@/components/dashboard/reports-list";
import { ReportsMapLazy } from "@/components/dashboard/reports-map-lazy";
import { ReportDetail } from "@/components/dashboard/report-detail";
import {
  SYNTHETIC_REPORTS,
  countByStatus,
} from "@/lib/data/reports";
import { categoryLabel } from "@/lib/categories";
import { isReportInJurisdiction } from "@/lib/plainsboro";
import {
  deleteReport,
  deleteReportUpdate,
  editReportUpdate,
  fetchReportUpdates,
  fetchReports,
  postReportUpdate,
} from "@/lib/reports-api";
import { formatAgo, reportTitle } from "@/lib/format";
import { cn } from "@/lib/utils";
import { compareRanked } from "@/lib/ai/rank";
import type { RankItem, RankResult } from "@/lib/ai/types";
import type {
  Report,
  ReportStatus,
  ReportUpdate,
  StatusFilter,
} from "@/lib/types";

let demoUpdateSeq = 1000;

export function DashboardApp({ onLogout }: { onLogout?: () => void } = {}) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [focusSeq, setFocusSeq] = useState(0);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const hasLoadedRef = useRef(false);
  const [updatesByReport, setUpdatesByReport] = useState<
    Record<number, ReportUpdate[]>
  >({});
  const [updatesLoading, setUpdatesLoading] = useState(false);
  const [rank, setRank] = useState<RankResult | null>(null);
  const [ranking, setRanking] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    if (!hasLoadedRef.current) setLoading(true);
    else setRefreshing(true);
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
      hasLoadedRef.current = true;
      setLoading(false);
      setRefreshing(false);
      setLastFetchedAt(Date.now());
    }
  }, []);

  const handleSelect = useCallback((id: number) => {
    setSelectedId(id);
    setFocusSeq((n) => n + 1);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const reportKey = reports
    .map((r) => `${r.id}:${r.status}`)
    .join(",");

  useEffect(() => {
    if (!reports.length) {
      setRank(null);
      return;
    }
    let cancelled = false;
    setRanking(true);
    void (async () => {
      try {
        const res = await fetch("/api/ai/rank", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reports }),
        });
        const body = (await res.json()) as RankResult & { error?: string };
        if (!res.ok) throw new Error(body.error || "Rank failed");
        if (!cancelled) setRank(body);
      } catch {
        if (!cancelled) setRank(null);
      } finally {
        if (!cancelled) setRanking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Rank when the set of reports changes, not on every field patch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportKey]);

  const counts = useMemo(() => countByStatus(reports), [reports]);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(reports.map((r) => r.category)))],
    [reports]
  );

  const rankById = useMemo(() => {
    const map: Record<number, RankItem> = {};
    for (const item of rank?.items ?? []) map[item.id] = item;
    return map;
  }, [rank]);

  const outOfTownReports = useMemo(() => {
    return reports.filter(
      (r) => !r.isDraft && !isReportInJurisdiction(r) && r.status !== "Resolved"
    );
  }, [reports]);

  const duePendingReports = useMemo(() => {
    const now = Date.now();
    return reports.filter((r) => {
      if (r.status !== "Pending" || !r.followUpAt) return false;
      const dueTime = new Date(r.followUpAt).getTime();
      return !isNaN(dueTime) && dueTime <= now;
    });
  }, [reports]);

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
        const ranked = compareRanked(rankById[a.id], rankById[b.id]);
        if (ranked !== 0) return ranked;
        return +new Date(b.time) - +new Date(a.time);
      });
  }, [reports, statusFilter, category, query, rankById]);

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
    payload: {
      status?: ReportStatus;
      comment?: string | null;
      follow_up_at?: string | null;
    }
  ) {
    const current = reports.find((r) => r.id === id);
    if (!current) return;

    const nextStatus = payload.status ?? current.status;
    const comment = payload.comment?.trim() || null;
    const followUpAt =
      payload.follow_up_at !== undefined
        ? payload.follow_up_at
        : current.followUpAt;

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
      applyReport({ ...current, status: nextStatus, followUpAt });
      prependUpdate(id, update);
      return;
    }

    setStatusSaving(true);
    try {
      const result = await postReportUpdate(id, payload);
      applyReport({ ...result.report, followUpAt });
      if (result.update) prependUpdate(id, result.update);
      else await loadUpdates(id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not post update";
      setLoadError(msg);
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleDeleteReport(id: number) {
    if (usingDemo) {
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (selectedId === id) setSelectedId(null);
      return;
    }

    setStatusSaving(true);
    try {
      await deleteReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not delete report";
      setLoadError(msg);
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleCancelAllOutOfJurisdiction() {
    if (!outOfTownReports.length) return;
    const count = outOfTownReports.length;
    const confirmMsg = `Cancel, send notifications, and remove ${count} out-of-jurisdiction report${count > 1 ? "s" : ""} from the system?`;
    if (!window.confirm(confirmMsg)) return;

    setStatusSaving(true);
    try {
      for (const r of outOfTownReports) {
        const comment = `Notice: This report is located outside Plainsboro Township municipal boundaries (${r.location}). The ticket has been cancelled in Plainsboro Township and forwarded to the appropriate neighboring jurisdiction.`;

        if (usingDemo) {
          const update: ReportUpdate = {
            id: ++demoUpdateSeq,
            report_id: r.id,
            user_id: r.user_id,
            report_title: reportTitle(r),
            old_status: r.status,
            new_status: "Resolved",
            comment,
            is_read: false,
            created_at: new Date().toISOString(),
          };
          prependUpdate(r.id, update);
          setReports((prev) => prev.filter((item) => item.id !== r.id));
        } else {
          await postReportUpdate(r.id, {
            status: "Resolved",
            comment,
          });
          await deleteReport(r.id);
          setReports((prev) => prev.filter((item) => item.id !== r.id));
        }
      }
      if (selectedId && outOfTownReports.some((r) => r.id === selectedId)) {
        setSelectedId(null);
      }
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "Could not cancel out-of-jurisdiction reports";
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
              {lastFetchedAt &&
                ` · updated ${formatAgo(new Date(lastFetchedAt).toISOString())}`}
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

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || refreshing}
            aria-busy={refreshing}
            aria-label="Refresh reports"
            title="Refresh reports"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#111827] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#1f2937] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-2 disabled:opacity-60"
          >
            <RefreshCw
              className={cn("size-3.5", refreshing && "animate-spin")}
              aria-hidden
            />
            Refresh
          </button>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              aria-label="Sign out"
              title="Sign out of DPW Portal"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3.5 text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#FCA5A5] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
            >
              <LogOut className="size-3.5" aria-hidden />
              <span>Sign Out</span>
            </button>
          )}
          <span className="sr-only" aria-live="polite">
            {refreshing
              ? "Refreshing reports"
              : lastFetchedAt
                ? `Reports updated ${formatAgo(new Date(lastFetchedAt).toISOString())}`
                : ""}
          </span>
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
              <div className="flex items-center gap-2">
                <p className="text-[12px] text-[#757575]">
                  {loading
                    ? "Loading…"
                    : ranking
                      ? "Ranking…"
                      : refreshing
                        ? "Refreshing…"
                        : `${filtered.length} in filter`}
                </p>
                <button
                  type="button"
                  disabled={!rank?.nextId}
                  onClick={() => rank?.nextId && handleSelect(rank.nextId)}
                  className="rounded-full bg-[#111827] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
                >
                  Work next
                </button>
              </div>
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

          {outOfTownReports.length > 0 && (
            <div className="mx-4 mb-2 flex flex-col gap-2 rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] p-2.5 text-[12px] text-[#991B1B]">
              <div className="flex items-center gap-1.5 font-medium">
                <AlertTriangle className="size-4 shrink-0 text-[#DC2626]" />
                <span>
                  <strong>{outOfTownReports.length}</strong> out-of-jurisdiction report{outOfTownReports.length > 1 ? "s" : ""}
                </span>
              </div>
              <button
                type="button"
                disabled={statusSaving}
                onClick={() => void handleCancelAllOutOfJurisdiction()}
                className="w-full rounded-full bg-[#DC2626] px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#B91C1C] disabled:opacity-50"
              >
                Cancel & Notify All ({outOfTownReports.length})
              </button>
            </div>
          )}

          {duePendingReports.length > 0 && (
            <div className="mx-4 mb-2 flex flex-col gap-1.5 rounded-2xl border border-[#FCD34D] bg-[#FEF3C7] p-2.5 text-[12px] text-[#92400E]">
              <div className="flex items-center gap-1.5 font-semibold text-[#D97706]">
                <Clock className="size-4 shrink-0 text-[#D97706]" />
                <span>
                  <strong>{duePendingReports.length}</strong> Pending Follow-Up{duePendingReports.length > 1 ? "s" : ""} Due Now
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSelect(duePendingReports[0].id)}
                className="w-full rounded-full bg-[#D97706] px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#B45309]"
              >
                Review Follow-Up #{duePendingReports[0].id}
              </button>
            </div>
          )}

          <div className="min-h-0 flex-1 px-2">
            {loading ? (
              <p className="px-2 py-8 text-sm text-[#757575]">Loading reports…</p>
            ) : (
              <ReportsList
                reports={filtered}
                rankById={rankById}
                selectedId={selectedId}
                nextId={rank?.nextId ?? null}
                onSelect={handleSelect}
              />
            )}
          </div>
        </section>

        <section className="relative min-h-0 min-w-0 flex-1">
          <ReportsMapLazy
            reports={
              selected && !filtered.some((r) => r.id === selected.id)
                ? [selected, ...filtered]
                : filtered
            }
            selectedId={selectedId}
            focusSeq={focusSeq}
            onSelect={handleSelect}
          />
          {selected && (
            <div className="ss-detail-overlay pointer-events-none absolute inset-y-0 right-0 z-[1100] flex max-w-[calc(100%-6.5rem)]">
              <div className="pointer-events-auto h-full shadow-[-12px_0_32px_rgb(17_24_39_/_0.12)]">
                <ReportDetail
                  report={selected}
                  queue={reports}
                  rank={rankById[selected.id]}
                  updates={selectedUpdates}
                  updatesLoading={updatesLoading}
                  onClose={() => setSelectedId(null)}
                  onPostUpdate={(payload) =>
                    handlePostUpdate(selected.id, payload)
                  }
                  onEditUpdate={handleEditUpdate}
                  onDeleteUpdate={handleDeleteUpdate}
                  onDeleteReport={handleDeleteReport}
                  saving={statusSaving}
                />
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

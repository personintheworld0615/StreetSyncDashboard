"use client";

/**
 * THESIS: Desktop dispatch using StreetSync tokens — not a blown-up HomeScreen.
 * OWN-WORLD: #F7F8FA, charcoal actions, Inter, Nunito mark, capsule chips, divider rows.
 * STORY: Scan counts, filter the queue, locate on the map, update status.
 * FIRST VIEWPORT: Compact top bar + counts; queue list and map share the remaining height.
 * FORM: App scheme, desktop topology. Data: Supabase `reports` via /api routes.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Flame, List, Map as MapIcon, Search } from "lucide-react";
import { StatusMetrics } from "@/components/dashboard/status-metrics";
import { ReportsList } from "@/components/dashboard/reports-list";
import { ReportsTable } from "@/components/dashboard/reports-table";
import { ReportsMapLazy } from "@/components/dashboard/reports-map-lazy";
import { ReportDetail } from "@/components/dashboard/report-detail";
import {
  SYNTHETIC_REPORTS,
  countByStatus,
} from "@/lib/data/reports";
import { categoryLabel } from "@/lib/categories";
import { fetchReports, updateReportStatus } from "@/lib/reports-api";
import { cn } from "@/lib/utils";
import type {
  MapMode,
  Report,
  ReportStatus,
  StatusFilter,
  ViewMode,
} from "@/lib/types";

export function DashboardApp() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [mapMode, setMapMode] = useState<MapMode>("pins");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

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

  async function handleStatusChange(id: number, status: ReportStatus) {
    if (usingDemo) {
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
      return;
    }

    setStatusSaving(true);
    try {
      const updated = await updateReportStatus(id, status);
      setReports((prev) =>
        prev.map((r) => (r.id === id ? updated : r))
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not update status";
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
              Municipal ops · West Windsor, NJ
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

          <div className="flex items-center rounded-full bg-[#111827] p-1">
            <button
              type="button"
              onClick={() => {
                setViewMode("map");
                setMapMode("pins");
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-white",
                viewMode === "map" && mapMode === "pins" && "bg-white/15"
              )}
            >
              <MapIcon className="size-3.5" aria-hidden />
              Pins
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("map");
                setMapMode("heatmap");
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-white",
                viewMode === "map" && mapMode === "heatmap" && "bg-white/15"
              )}
            >
              <Flame className="size-3.5" aria-hidden />
              Heatmap
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-white",
                viewMode === "list" && "bg-white/15"
              )}
            >
              <List className="size-3.5" aria-hidden />
              Table
            </button>
          </div>
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
          {viewMode === "map" ? (
            <ReportsMapLazy
              reports={filtered}
              selectedId={selectedId}
              mapMode={mapMode}
              onSelect={setSelectedId}
            />
          ) : (
            <div className="h-full overflow-auto bg-white">
              <ReportsTable
                reports={filtered}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
          )}
        </section>

        {selected && (
          <ReportDetail
            report={selected}
            onClose={() => setSelectedId(null)}
            onStatusChange={handleStatusChange}
            saving={statusSaving}
          />
        )}
      </main>
    </div>
  );
}

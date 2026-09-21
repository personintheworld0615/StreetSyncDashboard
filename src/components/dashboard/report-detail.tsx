"use client";

import { format } from "date-fns";
import { X } from "lucide-react";
import { SeverityBadge, StatusBadge } from "@/components/dashboard/badges";
import { categoryIcon, categoryLabel } from "@/lib/categories";
import { formatAgo, reportTitle, shortLocation } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Report, ReportStatus } from "@/lib/types";

type Props = {
  report: Report;
  onClose: () => void;
  onStatusChange: (id: number, status: ReportStatus) => void;
  saving?: boolean;
};

const statusActions: { value: ReportStatus; label: string }[] = [
  { value: "Open", label: "Open" },
  { value: "In Progress", label: "Active" },
  { value: "Resolved", label: "Resolved" },
];

export function ReportDetail({ report, onClose, onStatusChange, saving }: Props) {
  const Icon = categoryIcon(report.category);

  return (
    <aside className="ss-panel-enter flex h-full w-[320px] shrink-0 flex-col border-l border-[#E5E7EB] bg-white">
      <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EEF0F3]">
            <Icon className="size-4 text-[#111827]" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] text-[#757575]">
              {categoryLabel(report.category)} · #{report.id}
            </p>
            <h2 className="truncate text-[16px] font-semibold tracking-[-0.2px] text-[#111827]">
              {reportTitle(report)}
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#757575] hover:bg-[#E8EAED]"
          aria-label="Close detail"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={report.status} />
          <SeverityBadge severity={report.severity} />
          {report.synthetic && (
            <span className="text-[12px] text-[#757575]">Demo data</span>
          )}
          {saving && (
            <span className="text-[12px] text-[#757575]">Saving…</span>
          )}
        </div>

        <p className="text-[14px] leading-relaxed text-[#111827] text-pretty">
          {report.description}
        </p>

        <div className="text-[13px] text-[#757575]">
          <p>{shortLocation(report.location)}</p>
          <p className="mt-0.5 font-mono text-[11px] text-[#9CA3AF]">
            {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
          </p>
          <p className="mt-2">
            {format(new Date(report.time), "MMM d, yyyy")} · {formatAgo(report.time)}
          </p>
        </div>

        <div>
          <p className="mb-2 text-[12px] text-[#757575]">Status</p>
          <div className="flex rounded-full bg-[#EEF0F3] p-1">
            {statusActions.map((s) => {
              const active = report.status === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => onStatusChange(report.id, s.value)}
                  disabled={saving}
                  className={cn(
                    "flex-1 rounded-full py-1.5 text-[12px] font-medium",
                    active
                      ? "bg-[#111827] text-white"
                      : "text-[#6B7280] hover:text-[#111827]"
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}

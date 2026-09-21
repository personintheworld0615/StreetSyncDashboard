"use client";

import { categoryLabel } from "@/lib/categories";
import { formatAgo, reportTitle, shortLocation } from "@/lib/format";
import { SeverityBadge, StatusBadge } from "@/components/dashboard/badges";
import { cn } from "@/lib/utils";
import type { Report } from "@/lib/types";

type Props = {
  reports: Report[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

export function ReportsTable({ reports, selectedId, onSelect }: Props) {
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="text-[13px] text-[#757575]">
          <th className="px-4 py-3 font-medium">Issue</th>
          <th className="px-4 py-3 font-medium">Place</th>
          <th className="px-4 py-3 font-medium">Status</th>
          <th className="px-4 py-3 text-right font-medium">When</th>
        </tr>
      </thead>
      <tbody>
        {reports.map((report) => (
          <tr
            key={report.id}
            onClick={() => onSelect(report.id)}
            className={cn(
              "cursor-pointer border-t border-[#E5E7EB]",
              report.id === selectedId && "bg-[#E8EAED]/70"
            )}
          >
            <td className="px-4 py-3">
              <p className="flex max-w-[320px] items-center gap-1.5">
                <span className="truncate text-[15px] font-semibold tracking-[-0.2px] text-[#111827]">
                  {reportTitle(report)}
                </span>
                {report.status === "Resolved" && (
                  <StatusBadge status="Resolved" />
                )}
              </p>
              <p className="text-[12px] text-[#757575]">
                {categoryLabel(report.category)} · #{report.id}
              </p>
            </td>
            <td className="px-4 py-3 text-[13px] text-[#757575]">
              {shortLocation(report.location)}
            </td>
            <td className="px-4 py-3">
              <span className="inline-flex items-center gap-1.5">
                <StatusBadge status={report.status} />
                <SeverityBadge severity={report.severity} />
              </span>
            </td>
            <td className="px-4 py-3 text-right text-[13px] text-[#757575]">
              {formatAgo(report.time)}
            </td>
          </tr>
        ))}
        {reports.length === 0 && (
          <tr>
            <td colSpan={4} className="px-4 py-12 text-center text-sm text-[#757575]">
              No reports in this filter
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

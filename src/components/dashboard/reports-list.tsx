"use client";

import { ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SeverityBadge, StatusBadge } from "@/components/dashboard/badges";
import { categoryIcon } from "@/lib/categories";
import { formatAgo, reportTitle, shortLocation } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RankItem } from "@/lib/ai/types";
import type { Report } from "@/lib/types";

type Props = {
  reports: Report[];
  rankById: Record<number, RankItem>;
  selectedId: number | null;
  nextId: number | null;
  onSelect: (id: number) => void;
};

export function ReportsList({
  reports,
  rankById,
  selectedId,
  nextId,
  onSelect,
}: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea className="flex-1">
        <ul role="listbox" aria-label="Reports">
          {reports.map((report) => {
            const selected = report.id === selectedId;
            const Icon = categoryIcon(report.category);
            const rank = rankById[report.id];
            return (
              <li key={report.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => onSelect(report.id)}
                  className={cn(
                    "flex w-full items-center gap-3 py-2.5 pr-1 pl-2 text-left",
                    selected && "rounded-xl bg-[#E8EAED]"
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#EEF0F3]">
                    <Icon className="size-4 text-[#111827]" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-[14px] font-semibold tracking-[-0.2px] text-[#111827]">
                        {reportTitle(report)}
                      </span>
                      {rank && (
                        <SeverityBadge
                          label={rank.severityLabel}
                          outOfTown={!rank.gisInTownship}
                        />
                      )}
                      {nextId === report.id && report.status !== "Resolved" && (
                        <span className="shrink-0 rounded-full bg-[#111827] px-1.5 py-0.5 text-[11px] font-medium text-white">
                          Next
                        </span>
                      )}
                      {report.status !== "Open" && (
                        <StatusBadge status={report.status} />
                      )}
                    </span>
                    <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] text-[#757575]">
                      <span className="truncate">
                        {shortLocation(report.location)}
                      </span>
                      <span aria-hidden>·</span>
                      <span className="shrink-0">{formatAgo(report.time)}</span>
                    </span>
                  </span>
                  <ChevronRight
                    className="size-5 shrink-0 text-neutral-400"
                    aria-hidden
                  />
                </button>
                <div className="h-px bg-[#E5E7EB]" />
              </li>
            );
          })}
          {reports.length === 0 && (
            <li className="py-10 text-center text-sm text-[#757575]">
              No reports in this filter
            </li>
          )}
        </ul>
      </ScrollArea>
    </div>
  );
}

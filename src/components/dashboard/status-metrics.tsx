"use client";

import { cn } from "@/lib/utils";
import type { StatusFilter } from "@/lib/types";

type Props = {
  counts: { Open: number; "In Progress": number; Pending?: number; Resolved: number };
  active: StatusFilter;
  onSelect: (v: StatusFilter) => void;
};

const cells = [
  { key: "Open" as const, label: "open" },
  { key: "In Progress" as const, label: "active" },
  { key: "Pending" as const, label: "pending" },
  { key: "Resolved" as const, label: "resolved" },
];

export function StatusMetrics({ counts, active, onSelect }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-[#EEF0F3] p-1">
      {cells.map((cell) => {
        const selected = active === cell.key;
        return (
          <button
            key={cell.key}
            type="button"
            onClick={() => onSelect(selected ? "all" : cell.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-left transition-colors",
              selected ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280]"
            )}
          >
            <span className="text-[15px] font-semibold tracking-[-0.2px] tabular-nums">
              {counts[cell.key]}
            </span>
            <span className="ml-1.5 text-[13px]">{cell.label}</span>
          </button>
        );
      })}
    </div>
  );
}

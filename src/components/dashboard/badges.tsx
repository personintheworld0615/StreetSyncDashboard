import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/format";
import type { ReportStatus } from "@/lib/types";

const statusClass: Record<ReportStatus, string> = {
  Open: "bg-[#F3F4F6] text-[#4B5563]",
  "In Progress": "bg-[#FFF1E8] text-[#EA580C]",
  Resolved: "bg-[#E6F4F1] text-[#0F766E]",
};

function Pill({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium capitalize",
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: ReportStatus }) {
  return <Pill className={statusClass[status]}>{statusLabel(status)}</Pill>;
}

const severityClass = {
  Low: "bg-[#F3F4F6] text-[#4B5563]",
  Medium: "bg-[#FFF3E0] text-[#EA580C]",
  High: "bg-[#FFEBEE] text-[#E53935]",
} as const;

export function SeverityBadge({
  label,
  outOfTown,
}: {
  label?: "Low" | "Medium" | "High";
  outOfTown?: boolean;
}) {
  if (outOfTown) {
    return <Pill className="bg-[#FFEBEE] text-[#E53935]">Out</Pill>;
  }
  if (!label) return null;
  return <Pill className={severityClass[label]}>{label}</Pill>;
}

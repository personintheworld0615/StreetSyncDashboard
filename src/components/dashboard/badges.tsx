import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/format";
import type { ReportSeverity, ReportStatus } from "@/lib/types";

const statusClass: Record<ReportStatus, string> = {
  Open: "bg-[#F3F4F6] text-[#4B5563]",
  "In Progress": "bg-[#FFF1E8] text-[#EA580C]",
  Resolved: "bg-[#E6F4F1] text-[#0F766E]",
};

const severityClass: Record<ReportSeverity, string> = {
  high: "bg-[#FFEBEE] text-[#E53935]",
  medium: "bg-[#FFF3E0] text-[#FB8C00]",
  low: "bg-[#E8F5E9] text-[#43A047]",
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

export function SeverityBadge({ severity }: { severity: ReportSeverity }) {
  return <Pill className={severityClass[severity]}>{severity}</Pill>;
}

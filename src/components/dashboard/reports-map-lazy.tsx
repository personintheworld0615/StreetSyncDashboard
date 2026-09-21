"use client";

import dynamic from "next/dynamic";
import type { Report } from "@/lib/types";

const ReportsMapInner = dynamic(
  () =>
    import("@/components/dashboard/reports-map").then((m) => m.ReportsMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-0 items-center justify-center text-sm text-[#757575]">
        Loading map…
      </div>
    ),
  }
);

type Props = {
  reports: Report[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

export function ReportsMapLazy(props: Props) {
  return <ReportsMapInner {...props} />;
}

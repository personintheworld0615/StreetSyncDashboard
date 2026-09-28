import { NextResponse } from "next/server";
import { triageReport } from "@/lib/ai/triage";
import type { Report } from "@/lib/types";

export async function POST(request: Request) {
  let body: { report?: Report; queue?: Report[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const report = body.report;
  if (!report || typeof report.id !== "number") {
    return NextResponse.json({ error: "report is required" }, { status: 400 });
  }

  try {
    const triage = await triageReport(report, body.queue ?? []);
    return NextResponse.json(triage);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Triage failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

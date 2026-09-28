import { NextResponse } from "next/server";
import { draftFromTriage } from "@/lib/ai/draft";
import type { DraftKind, TriageResult } from "@/lib/ai/types";
import type { Report } from "@/lib/types";

export async function POST(request: Request) {
  let body: { report?: Report; triage?: TriageResult; kind?: DraftKind };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.report || !body.triage) {
    return NextResponse.json(
      { error: "report and triage are required" },
      { status: 400 }
    );
  }

  const kind: DraftKind = body.kind === "work_order" ? "work_order" : "comment";

  try {
    const draft = await draftFromTriage(body.report, body.triage, kind);
    return NextResponse.json(draft);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Draft failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

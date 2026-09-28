import { NextResponse } from "next/server";
import { rankQueue } from "@/lib/ai/rank";
import type { Report } from "@/lib/types";

export async function POST(request: Request) {
  let body: { reports?: Report[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const rank = await rankQueue(body.reports ?? []);
    return NextResponse.json(rank);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Rank failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

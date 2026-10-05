import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  isAllowedStatus,
  mapDbReport,
  mapDbUpdate,
  REPORT_SELECT,
  UPDATE_SELECT,
} from "@/lib/supabase/map-report";
import type { ReportStatus } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id: idRaw } = await params;
  const id = Number(idRaw);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
  }

  let body: { status?: string; comment?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const comment =
    typeof body.comment === "string" ? body.comment.trim() || null : null;

  const statusRaw = body.status?.trim();
  if (statusRaw && !isAllowedStatus(statusRaw)) {
    return NextResponse.json(
      { error: "status must be Open, In Progress, Pending, or Resolved" },
      { status: 422 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured on the server." },
      { status: 503 }
    );
  }

  const { data: existing, error: fetchError } = await supabase
    .from("reports")
    .select(REPORT_SELECT)
    .eq("id", id)
    .eq("is_draft", false)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const oldStatus = existing.status as ReportStatus;
  const nextStatus: ReportStatus = statusRaw
    ? (statusRaw as ReportStatus)
    : oldStatus;

  if (oldStatus === nextStatus && comment === null) {
    return NextResponse.json(
      { error: "Status is unchanged and no comment was provided" },
      { status: 400 }
    );
  }

  if (oldStatus !== nextStatus) {
    const { error: updateError } = await supabase
      .from("reports")
      .update({ status: nextStatus })
      .eq("id", id)
      .eq("is_draft", false);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  const { data: updateRow, error: insertError } = await supabase
    .from("updates")
    .insert({
      report_id: existing.id,
      user_id: existing.user_id,
      report_title: existing.title?.trim() || "",
      old_status: oldStatus,
      new_status: nextStatus,
      comment,
      is_read: false,
      created_at: new Date().toISOString(),
    })
    .select(UPDATE_SELECT)
    .maybeSingle();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select(REPORT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (reportError || !report) {
    return NextResponse.json(
      { error: reportError?.message ?? "Report not found after update" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    report: mapDbReport(report),
    update: updateRow ? mapDbUpdate(updateRow) : null,
  });
}

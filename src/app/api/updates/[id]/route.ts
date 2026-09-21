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

async function requireLatestUpdate(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  updateId: number
) {
  const { data: row, error } = await supabase
    .from("updates")
    .select(UPDATE_SELECT)
    .eq("id", updateId)
    .maybeSingle();

  if (error) {
    return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  }
  if (!row) {
    return { error: NextResponse.json({ error: "Update not found" }, { status: 404 }) };
  }

  const { data: latest, error: latestError } = await supabase
    .from("updates")
    .select("id")
    .eq("report_id", row.report_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    return {
      error: NextResponse.json({ error: latestError.message }, { status: 500 }),
    };
  }
  if (!latest || latest.id !== row.id) {
    return {
      error: NextResponse.json(
        { error: "Only the most recent update can be edited or deleted" },
        { status: 403 }
      ),
    };
  }

  return { row };
}

export async function PATCH(request: Request, { params }: Params) {
  const { id: idRaw } = await params;
  const id = Number(idRaw);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid update id" }, { status: 400 });
  }

  let body: { comment?: string | null; new_status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured on the server." },
      { status: 503 }
    );
  }

  const latest = await requireLatestUpdate(supabase, id);
  if ("error" in latest && latest.error) return latest.error;
  const existing = latest.row!;

  const patch: {
    comment?: string | null;
    new_status?: ReportStatus;
  } = {};

  if ("comment" in body) {
    patch.comment =
      typeof body.comment === "string" ? body.comment.trim() || null : null;
  }

  if (body.new_status !== undefined) {
    const status = body.new_status.trim();
    if (!isAllowedStatus(status)) {
      return NextResponse.json(
        { error: "new_status must be Open, In Progress, or Resolved" },
        { status: 422 }
      );
    }
    patch.new_status = status;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "Provide comment and/or new_status to update" },
      { status: 400 }
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("updates")
    .update(patch)
    .eq("id", id)
    .select(UPDATE_SELECT)
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Update not found" }, { status: 404 });
  }

  let report = null;
  if (patch.new_status) {
    const { data: reportRow, error: reportError } = await supabase
      .from("reports")
      .update({ status: patch.new_status })
      .eq("id", existing.report_id)
      .eq("is_draft", false)
      .select(REPORT_SELECT)
      .maybeSingle();

    if (reportError) {
      return NextResponse.json({ error: reportError.message }, { status: 500 });
    }
    report = reportRow ? mapDbReport(reportRow) : null;
  } else {
    const { data: reportRow } = await supabase
      .from("reports")
      .select(REPORT_SELECT)
      .eq("id", existing.report_id)
      .maybeSingle();
    report = reportRow ? mapDbReport(reportRow) : null;
  }

  return NextResponse.json({
    update: mapDbUpdate(updated),
    report,
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id: idRaw } = await params;
  const id = Number(idRaw);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid update id" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured on the server." },
      { status: 503 }
    );
  }

  const latest = await requireLatestUpdate(supabase, id);
  if ("error" in latest && latest.error) return latest.error;
  const existing = latest.row!;

  const { error: deleteError } = await supabase
    .from("updates")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const mapped = mapDbUpdate(existing);
  let report = null;

  if (mapped.old_status !== mapped.new_status) {
    const { data: reportRow, error: reportError } = await supabase
      .from("reports")
      .select(REPORT_SELECT)
      .eq("id", existing.report_id)
      .maybeSingle();

    if (reportError) {
      return NextResponse.json({ error: reportError.message }, { status: 500 });
    }

    if (reportRow && reportRow.status === mapped.new_status) {
      const { data: reverted, error: revertError } = await supabase
        .from("reports")
        .update({ status: mapped.old_status })
        .eq("id", existing.report_id)
        .select(REPORT_SELECT)
        .maybeSingle();

      if (revertError) {
        return NextResponse.json({ error: revertError.message }, { status: 500 });
      }
      report = reverted ? mapDbReport(reverted) : null;
    } else if (reportRow) {
      report = mapDbReport(reportRow);
    }
  } else {
    const { data: reportRow } = await supabase
      .from("reports")
      .select(REPORT_SELECT)
      .eq("id", existing.report_id)
      .maybeSingle();
    report = reportRow ? mapDbReport(reportRow) : null;
  }

  return NextResponse.json({ ok: true, report });
}

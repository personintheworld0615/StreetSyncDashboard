import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Params) {
  const { id: idRaw } = await params;
  const id = Number(idRaw);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured on the server." },
      { status: 503 }
    );
  }

  // Delete updates associated with this report first to avoid foreign key constraint
  const { error: updatesError } = await supabase
    .from("updates")
    .delete()
    .eq("report_id", id);

  if (updatesError) {
    console.warn("Could not delete associated updates:", updatesError.message);
  }

  // Delete report
  const { error: reportError } = await supabase
    .from("reports")
    .delete()
    .eq("id", id);

  if (reportError) {
    return NextResponse.json({ error: reportError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id });
}

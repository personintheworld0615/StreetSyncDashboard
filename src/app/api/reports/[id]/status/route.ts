import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAllowedStatus, mapDbReport } from "@/lib/supabase/map-report";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id: idRaw } = await params;
  const id = Number(idRaw);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
  }

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const status = body.status?.trim();
  if (!status || !isAllowedStatus(status)) {
    return NextResponse.json(
      { error: "status must be Open, In Progress, or Resolved" },
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

  const { data, error } = await supabase
    .from("reports")
    .update({ status })
    .eq("id", id)
    .eq("is_draft", false)
    .select(
      "id, title, description, category, latitude, longitude, location, image, severity, status, is_draft, time, user_id"
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json(mapDbReport(data));
}

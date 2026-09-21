import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mapDbReport } from "@/lib/supabase/map-report";

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured on the server." },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, title, description, category, latitude, longitude, location, image, status, is_draft, time, user_id"
    )
    .eq("is_draft", false)
    .order("time", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map(mapDbReport));
}

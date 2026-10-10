import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/server-auth";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server-auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    user: {
      username: user.username,
      department: user.department,
      title: "Municipal Operations Operator",
    },
  });
}

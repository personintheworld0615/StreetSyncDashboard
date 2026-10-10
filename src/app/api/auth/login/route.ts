import { NextResponse } from "next/server";
import {
  createSessionToken,
  setSessionCookie,
  verifyServerCredentials,
} from "@/lib/auth/server-auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      username?: string;
      password?: string;
    };
    const username = body.username ?? "";
    const password = body.password ?? "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password required." },
        { status: 400 }
      );
    }

    // Artificial delay to mitigate brute-force timing attacks
    await new Promise((resolve) => setTimeout(resolve, 400));

    const isValid = await verifyServerCredentials(username, password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid municipal credentials." },
        { status: 401 }
      );
    }

    const token = createSessionToken("plainsboro_dpw");
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        username: "plainsboro_dpw",
        department: "Plainsboro DPW",
        title: "Municipal Operations Operator",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Authentication server error" },
      { status: 500 }
    );
  }
}

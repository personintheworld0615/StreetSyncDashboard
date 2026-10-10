import { cookies } from "next/headers";
import crypto from "node:crypto";

const SESSION_COOKIE_NAME = "streetsync_dpw_session";
const SESSION_SECRET =
  process.env.AUTH_SECRET ||
  "streetsync-plainsboro-dpw-secure-session-key-2026-v2";

const DPW_USERNAME = "plainsboro_dpw";
// Salted SHA-256 hash of "PlainsboroDPW2026!"
const DPW_PASS_HASH = crypto
  .createHash("sha256")
  .update("PlainsboroDPW2026!" + "plainsboro_dpw_salt_2026")
  .digest("hex");

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function verifyServerCredentials(
  uInput: string,
  pInput: string
): Promise<boolean> {
  const uNorm = uInput.trim().toLowerCase();
  const pNorm = pInput.trim();

  const isUserValid = timingSafeCompare(uNorm, DPW_USERNAME);

  const inputHash = crypto
    .createHash("sha256")
    .update(pNorm + "plainsboro_dpw_salt_2026")
    .digest("hex");

  const isPassValid = timingSafeCompare(inputHash, DPW_PASS_HASH);

  return isUserValid && isPassValid;
}

export function createSessionToken(username: string): string {
  const payload = JSON.stringify({
    username,
    department: "Plainsboro DPW",
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000,
  });

  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("hex");

  return Buffer.from(payload).toString("base64url") + "." + signature;
}

export function verifySessionToken(
  token: string
): { username: string; department: string } | null {
  try {
    const [b64Payload, signature] = token.split(".");
    if (!b64Payload || !signature) return null;

    const payloadStr = Buffer.from(b64Payload, "base64url").toString("utf8");
    const expectedSig = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(payloadStr)
      .digest("hex");

    if (!timingSafeCompare(signature, expectedSig)) return null;

    const payload = JSON.parse(payloadStr) as {
      username: string;
      department: string;
      exp: number;
    };
    if (Date.now() > payload.exp) return null;

    return { username: payload.username, department: payload.department };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 86400,
  });
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

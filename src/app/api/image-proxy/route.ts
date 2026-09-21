import { NextResponse } from "next/server";

const ALLOWED_HOST_SUFFIXES = [
  "supabase.co",
  "supabase.in",
  "storage.googleapis.com",
];

function isAllowedImageUrl(raw: string) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    return ALLOWED_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`)
    );
  } catch {
    return false;
  }
}

function sniffImageType(bytes: ArrayBuffer): string | null {
  const u8 = new Uint8Array(bytes.slice(0, 12));
  if (u8.length >= 3 && u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    u8.length >= 8 &&
    u8[0] === 0x89 &&
    u8[1] === 0x50 &&
    u8[2] === 0x4e &&
    u8[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    u8.length >= 6 &&
    u8[0] === 0x47 &&
    u8[1] === 0x49 &&
    u8[2] === 0x46 &&
    u8[3] === 0x38
  ) {
    return "image/gif";
  }
  if (
    u8.length >= 12 &&
    u8[0] === 0x52 &&
    u8[1] === 0x49 &&
    u8[2] === 0x46 &&
    u8[3] === 0x46 &&
    u8[8] === 0x57 &&
    u8[9] === 0x45 &&
    u8[10] === 0x42 &&
    u8[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

/** Proxies report images so the client PDF builder can embed them. */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url")?.trim();
    if (!raw) {
    return NextResponse.json(
      { error: "Missing url" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
  if (!isAllowedImageUrl(raw)) {
    return NextResponse.json(
      { error: "URL not allowed" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const upstream = await fetch(raw, { cache: "no-store" });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream image failed (${upstream.status})` },
        {
          status: 502,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const bytes = await upstream.arrayBuffer();
    const headerType = upstream.headers.get("content-type") ?? "";
    const sniffed = sniffImageType(bytes);
    const contentType = headerType.startsWith("image/")
      ? headerType
      : sniffed;

    if (!contentType) {
      return NextResponse.json(
        { error: "Not an image" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from "next/server";

/**
 * Edge-safe session verification for middleware (no Node crypto here).
 * Mirrors src/lib/auth.ts token format: admin.<expires>.<hmac>.
 */
const SESSION_COOKIE = "biotek_admin";

async function verify(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [who, expires, sig] = parts;
  if (who !== "admin") return false;
  if (Number(expires) <= Date.now()) return false;

  const secret = process.env.ADMIN_SECRET ?? "insecure-dev-secret";
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const mac = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${who}.${expires}`)
    );
    const hex = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (hex.length !== sig.length) return false;
    let diff = 0;
    for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ sig.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}

/**
 * Guards /admin pages and /api/admin endpoints.
 * Unauthenticated requests to /api/admin get JSON 401;
 * /admin pages redirect to the login screen.
 * /api/admin/login must stay reachable without a session.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const authed = await verify(token);

  if (pathname.startsWith("/api/admin")) {
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/console/:path*",
    "/api/admin/events/:path*",
    "/api/admin/gallery/:path*",
    "/api/admin/parties/:path*",
    "/api/admin/mixes/:path*",
    "/api/admin/bookings/:path*",
    "/api/admin/logout/:path*",
  ],
};
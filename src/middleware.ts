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
 * Guards /admin pages and every /api/admin endpoint.
 * Unauthenticated requests to /api/admin get JSON 401;
 * /admin pages redirect to the login screen.
 * Only /api/admin/login (password check) and /api/admin/logout
 * (clears the cookie) are reachable without a session.
 */
const PUBLIC_ADMIN_API = new Set(["/api/admin/login", "/api/admin/logout"]);

/**
 * CSRF defense-in-depth for state-changing requests: SameSite=Lax cookies
 * already block cross-site POSTs, but verify Origin / Sec-Fetch-Site too.
 * Non-browser clients (curl, webhooks, tunnels) send neither header and pass.
 */
function crossSiteMutation(req: NextRequest): boolean {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site" && fetchSite !== "none") {
    return true;
  }
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.get("host")) return true;
    } catch {
      return true;
    }
  }
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/admin")) {
    if (req.method !== "GET" && req.method !== "HEAD" && crossSiteMutation(req)) {
      return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
    }
    if (!PUBLIC_ADMIN_API.has(pathname)) {
      const token = req.cookies.get(SESSION_COOKIE)?.value;
      if (!(await verify(token))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!(await verify(token))) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    // keep only an internal path in ?next (no protocol-relative, no backslashes)
    const internal =
      pathname.startsWith("/") && !pathname.startsWith("//") && !pathname.includes("\\")
        ? pathname
        : "/admin/console";
    url.searchParams.set("next", internal);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/console/:path*",
    "/api/admin/:path*",
  ],
};

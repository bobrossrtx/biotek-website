import { NextRequest, NextResponse } from "next/server";
import {
  checkPassword,
  createSessionToken,
  isAuthConfigured,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";
import { bodyTooLarge } from "@/lib/api-guard";
import { loginRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (bodyTooLarge(req, 4 * 1024)) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }

  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const retryAfter = loginRateLimiter.hit(ip);
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${Math.ceil(retryAfter / 60)} min.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "Admin auth not configured. Set ADMIN_PASSWORD and ADMIN_SECRET." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const password = String(body.password ?? "");

  if (!checkPassword(password)) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  loginRateLimiter.reset(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions);
  return res;
}

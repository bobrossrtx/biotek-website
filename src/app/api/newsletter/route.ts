import { NextRequest, NextResponse } from "next/server";
import { getDb, randomToken } from "@/lib/db";
import { bodyTooLarge } from "@/lib/api-guard";
import { newsletterRateLimiter, pruneRateLimiters } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  pruneRateLimiters();
  if (bodyTooLarge(req, 4 * 1024)) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }

  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const retryAfter = newsletterRateLimiter.hit(ip);
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS newsletter (
      email TEXT PRIMARY KEY,
      unsubscribe_token TEXT NOT NULL DEFAULT '',
      unsubscribed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  db.prepare(
    "INSERT OR IGNORE INTO newsletter (email, unsubscribe_token) VALUES (?, ?)"
  ).run(email, randomToken());

  return NextResponse.json({ ok: true });
}

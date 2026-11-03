import { NextRequest, NextResponse } from "next/server";
import { getDb, randomToken } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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

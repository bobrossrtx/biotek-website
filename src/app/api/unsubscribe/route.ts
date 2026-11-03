import { NextRequest, NextResponse } from "next/server";
import { getDb, randomToken } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Public unsubscribe endpoint: /api/unsubscribe?email=...&token=...
 * Linked from the footer of every sent mail-out.
 */
export async function GET(req: NextRequest) {
  const email = new URL(req.url).searchParams.get("email");
  const token = new URL(req.url).searchParams.get("token");

  if (!email || !token) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const db = getDb();
  const row = db
    .prepare("SELECT unsubscribe_token FROM newsletter WHERE email = ?")
    .get(email) as { unsubscribe_token: string } | undefined;

  if (!row || row.unsubscribe_token !== token) {
    return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  }

  db.prepare("UPDATE newsletter SET unsubscribed = 1 WHERE email = ?").run(email);
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  // resubscribe
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim();
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });
  getDb().prepare("UPDATE newsletter SET unsubscribed = 0 WHERE email = ?").run(email);
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Public unsubscribe endpoint: /api/unsubscribe?email=...&token=...
 * Linked from the footer of every sent mail-out.
 *
 * GET subscribes/unsubscribes with token verification.
 * POST (resubscribe) also requires the token — an open resubscribe would
 * let anyone re-add spam-trap addresses or reverse people's opt-out.
 */
export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const email = params.get("email");
  const token = params.get("token");

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

  // Unsubscribe = confirm opt-out. Resubscribing the same verified link is
  // allowed (it came from the subscriber's own mail) — but a bare request
  // without a token never is.
  if (params.get("resubscribe") === "1") {
    db.prepare("UPDATE newsletter SET unsubscribed = 0 WHERE email = ?").run(email);
  } else {
    db.prepare("UPDATE newsletter SET unsubscribed = 1 WHERE email = ?").run(email);
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim();
  const token = String(body.token ?? "").trim();

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

  db.prepare("UPDATE newsletter SET unsubscribed = 0 WHERE email = ?").run(email);
  return NextResponse.json({ ok: true });
}

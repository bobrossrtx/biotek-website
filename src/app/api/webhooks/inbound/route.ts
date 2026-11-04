import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "node:crypto";

export const runtime = "nodejs";

/**
 * Inbound email webhook (Resend Inbound Parse, or compatible).
 * Receives emails sent to bookings@biotekcrew.party and files them into
 * the matching booking's thread by:
 *   1. [BT-<id>] reference in the subject, or
 *   2. sender address matching a booking's email (latest booking first)
 *
 * Security: if INBOUND_WEBHOOK_SECRET is set, expects
 *   ?secret=<value> (query) or x-webhook-secret header.
 */

type ResendInboundPayload = {
  from?: string;
  to?: string | string[];
  subject?: string;
  text?: string;
  html?: string;
};

function extractRef(subject: string): number | null {
  const m = subject.match(/\[BT-(\d+)\]/);
  return m ? Number(m[1]) : null;
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.INBOUND_WEBHOOK_SECRET;
  if (!secret) return true; // open if unconfigured; recommend setting it
  const url = new URL(req.url);
  return (
    url.searchParams.get("secret") === secret ||
    req.headers.get("x-webhook-secret") === secret
  );
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await req.json().catch(() => null)) as ResendInboundPayload | null;
  if (!payload || !payload.from) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const fromAddr = payload.from.replace(/^.*</, "").replace(/>.*$/, "").trim();
  const subject = String(payload.subject ?? "(no subject)");
  const body =
    payload.text?.trim() ||
    String(payload.html ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() ||
    "(empty body)";

  const db = getDb();

  // find the booking this belongs to
  let bookingId = extractRef(subject);

  if (!bookingId) {
    const byEmail = db
      .prepare("SELECT id FROM bookings WHERE lower(email) = ? ORDER BY id DESC LIMIT 1")
      .get(fromAddr.toLowerCase()) as { id: number } | undefined;
    if (byEmail) bookingId = byEmail.id;
  }

  if (!bookingId) {
    return NextResponse.json({ ok: true, matched: false });
  }

  const exists = db.prepare("SELECT id FROM bookings WHERE id = ?").get(bookingId);
  if (!exists) {
    return NextResponse.json({ ok: true, matched: false });
  }

  db.prepare(
    `INSERT INTO email_messages (booking_id, direction, from_addr, to_addr, subject, body, provider_id)
     VALUES (?, 'in', ?, ?, ?, ?, ?)`
  ).run(
    bookingId,
    fromAddr,
    process.env.BOOKINGS_FROM || "bookings",
    subject,
    body,
    crypto.createHash("sha1").update(`${subject}|${fromAddr}|${body}`).digest("hex").slice(0, 32)
  );

  // a reply means the conversation is active again — mark unread
  db.prepare("UPDATE bookings SET read = 0 WHERE id = ?").run(bookingId);

  return NextResponse.json({ ok: true, matched: true, bookingId });
}

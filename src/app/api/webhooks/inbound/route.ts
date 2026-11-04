import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "node:crypto";

export const runtime = "nodejs";

/**
 * Inbound email webhook (Resend Inbound Parse, Svix-signed).
 * Receives emails sent to bookings@biotekcrew.party and files them into
 * the matching booking's thread by:
 *   1. [BT-<id>] reference in the subject, or
 *   2. sender address matching a booking's email (latest booking first)
 *
 * Security: Resend signs webhook payloads with Svix (svix-id /
 * svix-timestamp / svix-signature headers) using the endpoint's signing
 * secret (whsec_...). Set RESEND_WEBHOOK_SECRET to that value to enforce
 * verification. If unset, requests must carry ?secret=<INBOUND_WEBHOOK_SECRET>
 * (handy for manual curl testing).
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

/** Verify Svix webhook signature per the standard svix/webhook scheme. */
function verifySvixSignature(
  secret: string,
  id: string,
  timestamp: string,
  body: string,
  signatures: string[]
): boolean {
  if (!secret || !id || !timestamp || signatures.length === 0) return false;

  // timestamp freshness: 5 minutes
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (Number.isNaN(age) || age > 5 * 60) return false;

  const key = secret.replace(/^whsec_/, "");
  const signedContent = `${id}.${timestamp}.${body}`;
  const expected = crypto
    .createHmac("sha256", Buffer.from(key, "base64"))
    .update(signedContent)
    .digest("base64");

  return signatures.some((sig) => {
    // signatures header: "v1,<sig> v1,<sig> ..."
    const parts = sig.split(" ").filter(Boolean);
    return parts.some((p) => {
      const [version, digest] = p.split(",");
      return version === "v1" && crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(expected));
    });
  });
}

function authorized(req: NextRequest, rawBody: string): boolean {
  const svixSecret = process.env.RESEND_WEBHOOK_SECRET;
  const legacySecret = process.env.INBOUND_WEBHOOK_SECRET;

  // Svix-signed (the Resend default)
  if (svixSecret) {
    const id = req.headers.get("svix-id");
    const timestamp = req.headers.get("svix-timestamp");
    const sigHeader = req.headers.get("svix-signature") ?? "";
    if (id && timestamp && verifySvixSignature(svixSecret, id, timestamp, rawBody, sigHeader.split(" "))) {
      return true;
    }
    console.error("[inbound] svix verification failed:", {
      has_svix_id: !!id,
      has_svix_timestamp: !!timestamp,
      has_svix_signature: sigHeader.length > 0,
      secret_prefix: svixSecret.slice(0, 6),
    });
  }

  // manual test path (curl with shared secret)
  if (legacySecret) {
    const url = new URL(req.url);
    if (
      url.searchParams.get("secret") === legacySecret ||
      req.headers.get("x-webhook-secret") === legacySecret
    ) {
      return true;
    }
  }

  // if neither secret is configured, accept (open endpoint — not recommended)
  return !svixSecret && !legacySecret;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!authorized(req, rawBody)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody || "{}") as ResendInboundPayload & { type?: string };

  // Resend may wrap the email in an envelope depending on webhook version
  const email = (payload as Record<string, unknown>).data
    ? ((payload as Record<string, unknown>).data as ResendInboundPayload)
    : payload;

  if (!email || !email.from) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const fromAddr = email.from
    .replace(/^.*</, "")
    .replace(/>.*$/, "")
    .replace(/"/g, "")
    .trim();
  const subject = String(email.subject ?? "(no subject)");
  const body =
    email.text?.trim() ||
    String(email.html ?? "")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim() ||
    "(empty body)";

  const db = getDb();

  let bookingId = extractRef(subject);

  if (!bookingId) {
    const byEmail = db
      .prepare("SELECT id FROM bookings WHERE lower(email) = ? ORDER BY id DESC LIMIT 1")
      .get(fromAddr.toLowerCase()) as { id: number } | undefined;
    if (byEmail) bookingId = byEmail.id;
  }

  if (!bookingId) {
    return NextResponse.json({
      ok: true,
      matched: false,
      reason: `no [BT-x] reference in subject "${subject}" and sender ${fromAddr} has no booking`,
    });
  }

  const exists = db.prepare("SELECT id FROM bookings WHERE id = ?").get(bookingId);
  if (!exists) {
    return NextResponse.json({
      ok: true,
      matched: false,
      reason: `booking BT-${bookingId} referenced in subject does not exist (deleted?)`,
    });
  }

  // dedupe: same provider payload may be retried by Resend
  const providerId = crypto
    .createHash("sha1")
    .update(`${subject}|${fromAddr}|${body}`)
    .digest("hex")
    .slice(0, 32);
  const dupe = db
    .prepare("SELECT id FROM email_messages WHERE provider_id = ?")
    .get(providerId);
  if (dupe) {
    return NextResponse.json({ ok: true, matched: true, bookingId, duplicate: true });
  }

  db.prepare(
    `INSERT INTO email_messages (booking_id, direction, from_addr, to_addr, subject, body, provider_id)
     VALUES (?, 'in', ?, ?, ?, ?, ?)`
  ).run(bookingId, fromAddr, process.env.BOOKINGS_FROM || "bookings", subject, body, providerId);

  // a reply means the conversation is active again — mark unread
  db.prepare("UPDATE bookings SET read = 0 WHERE id = ?").run(bookingId);

  return NextResponse.json({ ok: true, matched: true, bookingId });
}

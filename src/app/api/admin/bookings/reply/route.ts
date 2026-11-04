import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

function buildTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const bookingId = Number(body.bookingId);
  const text = String(body.message ?? "").trim();

  if (!bookingId || !text) {
    return NextResponse.json({ error: "bookingId and message are required" }, { status: 400 });
  }

  const db = getDb();
  const booking = db
    .prepare("SELECT id, name, email FROM bookings WHERE id = ?")
    .get(bookingId) as { id: number; name: string; email: string } | undefined;

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const transport = buildTransport();
  if (!transport) {
    return NextResponse.json(
      { error: "Mail not configured (SMTP missing)" },
      { status: 500 }
    );
  }

  const from = process.env.BOOKINGS_FROM || process.env.CREW_EMAIL || process.env.SMTP_USER || "BioTek";
  const subject = `Re: Booking request received [BT-${bookingId}] — BioTek Sound System`;

  try {
    const info = await transport.sendMail({
      from,
      to: booking.email,
      replyTo: from,
      subject,
      text: `Hi ${booking.name},\n\n${text}\n\n— BioTek Sound System\nhttps://biotekcrew.party`,
    });

    db.prepare(
      `INSERT INTO email_messages (booking_id, direction, from_addr, to_addr, subject, body, provider_id)
       VALUES (?, 'out', ?, ?, ?, ?, ?)`
    ).run(bookingId, from, booking.email, subject, text, info.messageId ?? "");

    return NextResponse.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed" },
      { status: 500 }
    );
  }
}

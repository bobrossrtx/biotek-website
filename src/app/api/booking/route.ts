import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

/**
 * Public booking form endpoint. Saves enquiries to the DB (admin console
 * inbox) and emails an acknowledgement to the requester.
 */

function buildTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function POST(req: NextRequest) {
  const data = await req.formData().catch(() => null);
  if (!data) {
    return NextResponse.json({ error: "Invalid form" }, { status: 400 });
  }

  // honeypot: pretend success for bots
  if (String(data.get("_gotcha") ?? "") !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = String(data.get("name") ?? "").trim();
  const email = String(data.get("email") ?? "").trim();
  const eventDate = String(data.get("eventDate") ?? "").trim();
  const location = String(data.get("location") ?? "").trim();
  const eventType = String(data.get("eventType") ?? "").trim();
  const message = String(data.get("message") ?? "").trim();

  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const bookingInfo = getDb()
    .prepare(
      `INSERT INTO bookings (name, email, event_date, location, event_type, message)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(name, email, eventDate, location, eventType, message);
  const bookingId = Number(bookingInfo.lastInsertRowid);

  // acknowledgement email to the requester (non-blocking failure: the
  // booking is saved either way)
  const transport = buildTransport();
  if (transport) {
    const from = process.env.MAIL_FROM || process.env.SMTP_USER || "BioTek";
    const crewEmail = process.env.CREW_EMAIL || process.env.SMTP_USER;
    const bookingsFrom = process.env.BOOKINGS_FROM || crewEmail;
    const prettyDate = eventDate
      ? new Date(eventDate + "T12:00:00").toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "not specified";

    try {
      await transport.sendMail({
        from: bookingsFrom,
        to: email,
        replyTo: crewEmail,
        subject: `Booking request received [BT-${bookingId}] — BioTek Sound System`,
        text: `Hi ${name},

Thanks for getting in touch — your booking request is in our inbox.

  Event type: ${eventType || "not specified"}
  Date:       ${prettyDate}
  Location:   ${location || "not specified"}

Your message:
"${message}"

We'll come back to you within a couple of days with availability and
details. For anything urgent, reply to this email directly.

BioTek Sound System
https://biotekcrew.party`,
        html: `
    <div style="font-family: system-ui, sans-serif; max-width: 34rem; margin: 0 auto; color: #1a1f1c; line-height: 1.6;">
      <div style="border-bottom: 3px solid #a3ff3c; padding-bottom: 0.75rem; margin-bottom: 1.5rem;">
        <span style="font-size: 1.3rem; font-weight: 900; letter-spacing: 0.05em;">BIO<span style="color: #86e02e;">TEK</span></span>
      </div>
      <p>Hi ${name},</p>
      <p>Thanks for getting in touch — your booking request is in our inbox.</p>
      <table style="border-collapse: collapse; font-size: 0.95rem;">
        <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #556;">Event type</td><td>${eventType || "not specified"}</td></tr>
        <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #556;">Date</td><td>${prettyDate}</td></tr>
        <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #556;">Location</td><td>${location || "not specified"}</td></tr>
      </table>
      <p style="margin-top: 1.25rem;">Your message:</p>
      <p style="background: #f2f6f0; padding: 1rem; border-left: 3px solid #a3ff3c; white-space: pre-wrap;">${message}</p>
      <p>We'll come back to you within a couple of days with availability and details. For anything urgent, reply to this email directly.</p>
      <p style="margin-top: 2rem;">BioTek Sound System<br/><a href="https://biotekcrew.party" style="color: #86e02e;">biotekcrew.party</a></p>
    </div>`,
      });
      // record the acknowledgement as the first message in the thread
      getDb()
        .prepare(
          `INSERT INTO email_messages (booking_id, direction, from_addr, to_addr, subject, body)
           VALUES (?, 'out', ?, ?, ?, ?)`
        )
        .run(bookingId, from, email, `Booking request received [BT-${bookingId}]`, message ? `Hi ${name},\n\nThanks for getting in touch — your booking request is in our inbox.\n\nEvent type: ${eventType}\nDate: ${prettyDate}\nLocation: ${location}\n\nYour message:\n${message}\n\nWe'll come back to you within a couple of days.` : `Acknowledgement for booking BT-${bookingId}`);
    } catch (err) {
      console.error("Booking acknowledgement email failed:", err);
    }
  } else {
    // no mail transport — still seed the thread with the original enquiry context
    getDb()
      .prepare(
        `INSERT INTO email_messages (booking_id, direction, from_addr, to_addr, subject, body)
         VALUES (?, 'in', ?, ?, ?, ?)`
      )
      .run(bookingId, email, "bookings", "Booking enquiry", message);
  }

  return NextResponse.json({ ok: true });
}

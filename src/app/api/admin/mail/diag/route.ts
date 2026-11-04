import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

/**
 * Admin-only mail diagnostics: shows what the running process actually
 * sees, masked. Optionally performs a live test send to delivered@resend.dev
 * (Resend's test recipient) via ?test=1.
 */
function mask(v: string | undefined): string {
  if (!v) return "(not set)";
  if (v.length <= 8) return v[0] + "***";
  return v.slice(0, 6) + "…" + v.slice(-4);
}

export async function GET(req: NextRequest) {
  const doTest = new URL(req.url).searchParams.get("test") === "1";

  const diag: Record<string, unknown> = {
    smtp_host: mask(process.env.SMTP_HOST),
    smtp_port: process.env.SMTP_PORT ?? "(not set, default 587)",
    smtp_user: mask(process.env.SMTP_USER),
    smtp_pass: mask(process.env.SMTP_PASS),
    mail_from: process.env.MAIL_FROM ?? "(not set)",
    crew_email: process.env.CREW_EMAIL ?? "(not set)",
    bookings_from: process.env.BOOKINGS_FROM ?? "(not set)",
    crew_email_source: process.env.CREW_EMAIL
      ? "CREW_EMAIL"
      : process.env.SMTP_USER
        ? "fallback SMTP_USER"
        : "none",
  };

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    diag.transport = "NOT CREATED — missing SMTP_HOST, SMTP_USER or SMTP_PASS";
    return NextResponse.json(diag);
  }

  diag.transport = "created";

  if (doTest) {
    try {
      const t = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      const info = await t.sendMail({
        from: process.env.BOOKINGS_FROM || process.env.MAIL_FROM || user,
        to: "delivered@resend.dev",
        subject: "BioTek mail diagnostic — live test",
        text: "Diagnostic test send from the BioTek site.",
      });
      diag.test_send = `OK — accepted by provider (messageId: ${info.messageId})`;
    } catch (err) {
      diag.test_send = `FAILED: ${err instanceof Error ? err.message : String(err)}`;
    }
  } else {
    diag.test_send = "add ?test=1 to the URL to attempt a live send";
  }

  return NextResponse.json(diag);
}

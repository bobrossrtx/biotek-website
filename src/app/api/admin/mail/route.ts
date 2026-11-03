import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

type Sub = {
  email: string;
  unsubscribe_token: string;
};

function buildTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  // config status for the admin UI
  const t = buildTransport();
  return NextResponse.json({
    configured: !!t,
    from: process.env.MAIL_FROM ?? process.env.SMTP_USER ?? "",
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const subject = String(body.subject ?? "").trim();
  const message = String(body.message ?? "").trim();
  const testMode = !!body.testTo;
  const testTo = String(body.testTo ?? "").trim();

  if (!subject || !message) {
    return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
  }

  const transport = buildTransport();
  if (!transport) {
    return NextResponse.json(
      {
        error:
          "Mail not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM in .env.local and restart.",
      },
      { status: 500 }
    );
  }

  const db = getDb();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || "BioTek";
  const baseUrl = process.env.SITE_URL || "http://localhost:3000";
  const appName = "BioTek Sound System";

  let recipients: Sub[];
  if (testMode) {
    recipients = [{ email: testTo, unsubscribe_token: "test" }];
  } else {
    recipients = db
      .prepare(
        "SELECT email, unsubscribe_token FROM newsletter WHERE unsubscribed = 0"
      )
      .all() as Sub[];
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No subscribers to send to" }, { status: 400 });
  }

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 34rem; margin: 0 auto; color: #1a1f1c; line-height: 1.6;">
      <div style="border-bottom: 3px solid #a3ff3c; padding-bottom: 0.75rem; margin-bottom: 1.5rem;">
        <span style="font-size: 1.3rem; font-weight: 900; letter-spacing: 0.05em;">BIO<span style="color: #86e02e;">TEK</span></span>
      </div>
      ${message
        .split("\n\n")
        .map(
          (p) =>
            `<p style="margin: 0 0 1rem; white-space: pre-wrap;">${esc(p).replace(/\n/g, "<br/>")}</p>`
        )
        .join("\n")}
      <hr style="border: none; border-top: 1px solid #dfe6df; margin: 2rem 0 1rem;" />
      <p style="font-size: 0.75rem; color: #7d907c;">
        You're receiving this because you signed up for BioTek party updates.
        <a href="${baseUrl}/api/unsubscribe?email=${encodeURIComponent("__EMAIL__")}&token=__TOKEN__" style="color: #86e02e;">Unsubscribe</a>
      </p>
    </div>`;

  const text = `${message}\n\n---\n${appName}\nUnsubscribe: ${baseUrl}/api/unsubscribe?email=__EMAIL__&token=__TOKEN__`;

  let sent = 0;
  const failures: { email: string; error: string }[] = [];

  for (const r of recipients) {
    const htmlOut = html.replaceAll("__EMAIL__", r.email).replaceAll("__TOKEN__", r.unsubscribe_token);
    const textOut = text.replaceAll("__EMAIL__", r.email).replaceAll("__TOKEN__", r.unsubscribe_token);
    try {
      await transport.sendMail({
        from,
        to: r.email,
        subject,
        text: textOut,
        html: htmlOut,
      });
      sent += 1;
    } catch (err) {
      failures.push({ email: r.email, error: err instanceof Error ? err.message : "send failed" });
    }
  }

  if (!testMode) {
    db.prepare("INSERT INTO sent_messages (subject, body, recipients) VALUES (?, ?, ?)").run(
      subject,
      message,
      sent
    );
  }

  return NextResponse.json({
    ok: sent > 0,
    sent,
    failed: failures.length,
    failures: failures.slice(0, 5),
  });
}

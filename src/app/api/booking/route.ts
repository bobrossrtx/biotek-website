import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Public booking form endpoint. Saves enquiries to the DB so the crew can
 * read them in the admin console.
 */
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

  getDb()
    .prepare(
      `INSERT INTO bookings (name, email, event_date, location, event_type, message)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(name, email, eventDate, location, eventType, message);

  return NextResponse.json({ ok: true });
}

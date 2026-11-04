import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const bookingId = Number(new URL(req.url).searchParams.get("bookingId"));
  if (!bookingId) {
    return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
  }

  const rows = getDb()
    .prepare(
      `SELECT id, direction, from_addr, to_addr, subject, body, created_at
       FROM email_messages WHERE booking_id = ? ORDER BY created_at ASC, id ASC`
    )
    .all(bookingId) as {
    id: number;
    direction: "in" | "out";
    from_addr: string;
    to_addr: string;
    subject: string;
    body: string;
    created_at: string;
  }[];

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      direction: r.direction,
      from: r.from_addr,
      to: r.to_addr,
      subject: r.subject,
      body: r.body,
      createdAt: r.created_at,
    }))
  );
}

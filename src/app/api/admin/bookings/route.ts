import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin, bodyTooLarge } from "@/lib/api-guard";

export const runtime = "nodejs";

type BookingRow = {
  id: number;
  name: string;
  email: string;
  event_date: string;
  location: string;
  event_type: string;
  message: string;
  read: number;
  created_at: string;
};

export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const showRead = new URL(req.url).searchParams.get("all") === "1";
  const rows = getDb()
    .prepare(
      showRead
        ? "SELECT * FROM bookings ORDER BY created_at DESC"
        : "SELECT * FROM bookings WHERE read = 0 ORDER BY created_at DESC"
    )
    .all() as BookingRow[];
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      eventDate: r.event_date,
      location: r.location,
      eventType: r.event_type,
      message: r.message,
      read: !!r.read,
      createdAt: r.created_at,
    }))
  );
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (bodyTooLarge(req)) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  getDb()
    .prepare("UPDATE bookings SET read = ? WHERE id = ?")
    .run(body.read ? 1 : 0, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  getDb().prepare("DELETE FROM bookings WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin, bodyTooLarge } from "@/lib/api-guard";

export const runtime = "nodejs";

type EventRow = {
  id: number;
  title: string;
  date: string;
  doors: string;
  venue: string;
  city: string;
  address: string;
  lineup: string;
  price: string;
  ticket_url: string;
  rsvp_url: string;
  featured: number;
  past: number;
  past_gallery: string;
};

function rowToJson(r: EventRow) {
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    doors: r.doors,
    venue: r.venue,
    city: r.city,
    address: r.address,
    lineup: JSON.parse(r.lineup || "[]") as string[],
    price: r.price,
    ticketUrl: r.ticket_url,
    rsvpUrl: r.rsvp_url,
    featured: !!r.featured,
    past: !!r.past,
    pastGallery: r.past_gallery,
  };
}

function bodyToRow(b: Record<string, unknown>) {
  return {
    title: String(b.title ?? "").trim(),
    date: String(b.date ?? "").trim(),
    doors: String(b.doors ?? "").trim(),
    venue: String(b.venue ?? "").trim(),
    city: String(b.city ?? "").trim(),
    address: String(b.address ?? "").trim(),
    lineup: JSON.stringify(Array.isArray(b.lineup) ? b.lineup : []),
    price: String(b.price ?? "").trim(),
    ticket_url: String(b.ticketUrl ?? "").trim(),
    rsvp_url: String(b.rsvpUrl ?? "").trim(),
    featured: b.featured ? 1 : 0,
    past: b.past ? 1 : 0,
    past_gallery: String(b.pastGallery ?? "").trim(),
  };
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const rows = getDb()
    .prepare("SELECT * FROM events ORDER BY date ASC")
    .all() as EventRow[];
  return NextResponse.json(rows.map(rowToJson));
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (bodyTooLarge(req)) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }
  const body = await req.json().catch(() => ({}));
  const row = bodyToRow(body);
  if (!row.title || !row.date) {
    return NextResponse.json({ error: "Title and date are required" }, { status: 400 });
  }
  const info = getDb()
    .prepare(
      `INSERT INTO events (title, date, doors, venue, city, address, lineup, price, ticket_url, rsvp_url, featured, past, past_gallery)
       VALUES (@title, @date, @doors, @venue, @city, @address, @lineup, @price, @ticket_url, @rsvp_url, @featured, @past, @past_gallery)`
    )
    .run(row);
  const created = getDb()
    .prepare("SELECT * FROM events WHERE id = ?")
    .get(info.lastInsertRowid) as EventRow;
  return NextResponse.json(rowToJson(created), { status: 201 });
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
  const row = bodyToRow(body);
  if (!row.title || !row.date) {
    return NextResponse.json({ error: "Title and date are required" }, { status: 400 });
  }
  getDb()
    .prepare(
      `UPDATE events SET title=@title, date=@date, doors=@doors, venue=@venue, city=@city, address=@address,
       lineup=@lineup, price=@price, ticket_url=@ticket_url, rsvp_url=@rsvp_url,
       featured=@featured, past=@past, past_gallery=@past_gallery WHERE id=@id`
    )
    .run({ ...row, id });
  const updated = getDb()
    .prepare("SELECT * FROM events WHERE id = ?")
    .get(id) as EventRow;
  return NextResponse.json(rowToJson(updated));
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  getDb().prepare("DELETE FROM events WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}

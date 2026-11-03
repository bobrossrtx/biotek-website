import { NextRequest, NextResponse } from "next/server";
import { getDb, UPLOADS_DIR } from "@/lib/db";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

type PartyRow = {
  id: number;
  name: string;
  date: string;
  description: string;
};

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.*, COUNT(g.id) AS photo_count
       FROM parties p LEFT JOIN gallery g ON g.party_id = p.id
       GROUP BY p.id ORDER BY p.date DESC, p.id DESC`
    )
    .all() as (PartyRow & { photo_count: number })[];
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      date: r.date,
      description: r.description,
      photoCount: r.photo_count,
    }))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const date = String(body.date ?? "").trim();
  const description = String(body.description ?? "").trim();

  const info = getDb()
    .prepare("INSERT INTO parties (name, date, description) VALUES (?, ?, ?)")
    .run(name, date, description);
  const created = getDb()
    .prepare("SELECT * FROM parties WHERE id = ?")
    .get(info.lastInsertRowid) as PartyRow;
  return NextResponse.json(
    { id: created.id, name: created.name, date: created.date, description: created.description, photoCount: 0 },
    { status: 201 }
  );
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  getDb()
    .prepare("UPDATE parties SET name = ?, date = ?, description = ? WHERE id = ?")
    .run(name, String(body.date ?? "").trim(), String(body.description ?? "").trim(), id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  // photos in this party get deleted too (cascade needs PRAGMA foreign_keys)
  const db = getDb();
  const photos = db
    .prepare("SELECT src FROM gallery WHERE party_id = ?")
    .all(id) as { src: string }[];
  db.prepare("DELETE FROM gallery WHERE party_id = ?").run(id);
  db.prepare("DELETE FROM parties WHERE id = ?").run(id);
  // remove uploaded files
  for (const p of photos) {
    if (p.src.startsWith("/api/uploads/")) {
      fs.rmSync(path.join(UPLOADS_DIR, path.basename(p.src)), { force: true });
    }
  }
  return NextResponse.json({ ok: true });
}

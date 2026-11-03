import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

type MixRow = {
  id: number;
  title: string;
  date: string;
  description: string;
  platform: string;
  embed_url: string;
  play_url: string;
  featured: number;
};

const PLATFORMS = new Set(["soundcloud", "mixcloud", "bandcamp"]);

function rowToJson(r: MixRow) {
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    description: r.description,
    platform: r.platform,
    embedUrl: r.embed_url,
    playUrl: r.play_url,
    featured: !!r.featured,
  };
}

function bodyToRow(b: Record<string, unknown>) {
  return {
    title: String(b.title ?? "").trim(),
    date: String(b.date ?? "").trim(),
    description: String(b.description ?? "").trim(),
    platform: PLATFORMS.has(String(b.platform)) ? String(b.platform) : "soundcloud",
    embed_url: String(b.embedUrl ?? "").trim(),
    play_url: String(b.playUrl ?? "").trim(),
    featured: b.featured ? 1 : 0,
  };
}

export async function GET() {
  const rows = getDb()
    .prepare("SELECT * FROM mixes ORDER BY date DESC")
    .all() as MixRow[];
  return NextResponse.json(rows.map(rowToJson));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const row = bodyToRow(body);
  if (!row.title || !row.date || !row.embed_url) {
    return NextResponse.json(
      { error: "Title, date and embed URL are required" },
      { status: 400 }
    );
  }
  // only one featured at a time
  if (row.featured) {
    getDb().prepare("UPDATE mixes SET featured = 0").run();
  }
  const info = getDb()
    .prepare(
      `INSERT INTO mixes (title, date, description, platform, embed_url, play_url, featured)
       VALUES (@title, @date, @description, @platform, @embed_url, @play_url, @featured)`
    )
    .run(row);
  const created = getDb()
    .prepare("SELECT * FROM mixes WHERE id = ?")
    .get(info.lastInsertRowid) as MixRow;
  return NextResponse.json(rowToJson(created), { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const row = bodyToRow(body);
  if (!row.title || !row.date || !row.embed_url) {
    return NextResponse.json(
      { error: "Title, date and embed URL are required" },
      { status: 400 }
    );
  }
  if (row.featured) {
    getDb().prepare("UPDATE mixes SET featured = 0").run();
  }
  getDb()
    .prepare(
      `UPDATE mixes SET title=@title, date=@date, description=@description,
       platform=@platform, embed_url=@embed_url, play_url=@play_url, featured=@featured
       WHERE id=@id`
    )
    .run({ ...row, id });
  const updated = getDb()
    .prepare("SELECT * FROM mixes WHERE id = ?")
    .get(id) as MixRow;
  return NextResponse.json(rowToJson(updated));
}

export async function DELETE(req: NextRequest) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  getDb().prepare("DELETE FROM mixes WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}

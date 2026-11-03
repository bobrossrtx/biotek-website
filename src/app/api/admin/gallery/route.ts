import { NextRequest, NextResponse } from "next/server";
import { getDb, UPLOADS_DIR } from "@/lib/db";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const runtime = "nodejs";

import { IMAGE_TYPES, VIDEO_TYPES, ALLOWED_MEDIA, extForMime, isVideoMime } from "@/lib/media";

const MAX_SIZE = 100 * 1024 * 1024; // 100MB per file (videos need headroom)

type GalleryRow = {
  id: number;
  src: string;
  alt: string;
  party_id: number | null;
  media_type: "image" | "video";
};

export async function GET(req: NextRequest) {
  const partyParam = new URL(req.url).searchParams.get("partyId");
  const db = getDb();
  let rows: GalleryRow[];
  if (partyParam === "unsorted") {
    rows = db
      .prepare("SELECT * FROM gallery WHERE party_id IS NULL ORDER BY created_at DESC, id DESC")
      .all() as GalleryRow[];
  } else if (partyParam) {
    rows = db
      .prepare("SELECT * FROM gallery WHERE party_id = ? ORDER BY created_at DESC, id DESC")
      .all(Number(partyParam)) as GalleryRow[];
  } else {
    rows = db
      .prepare("SELECT * FROM gallery ORDER BY created_at DESC, id DESC")
      .all() as GalleryRow[];
  }
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      src: r.src,
      alt: r.alt,
      partyId: r.party_id,
      mediaType: r.media_type,
    }))
  );
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const contentType = req.headers.get("content-type") ?? "";

  // JSON path: register an already-hosted image URL
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    const src = String(body.src ?? "").trim();
    if (!src) return NextResponse.json({ error: "Missing src" }, { status: 400 });
    const alt = String(body.alt ?? "").trim();
    const partyId = body.partyId ? Number(body.partyId) : null;
    const mediaType = body.mediaType === "video" ? "video" : "image";
    const info = db
      .prepare("INSERT INTO gallery (src, alt, party_id, media_type) VALUES (?, ?, ?, ?)")
      .run(src, alt, partyId, mediaType);
    return NextResponse.json(
      { id: info.lastInsertRowid, src, alt, partyId, mediaType },
      { status: 201 }
    );
  }

  // Multipart path: multi-file upload into a party folder
  const form = await req.formData();
  const isFile = (f: FormDataEntryValue | null): f is File =>
    !!f && typeof f === "object" && "arrayBuffer" in f && "size" in f && "type" in f;
  const files = form.getAll("files").filter(isFile);
  const single = form.get("file");
  if (isFile(single)) files.push(single);
  const alt = String(form.get("alt") ?? "").trim();
  const partyRaw = String(form.get("partyId") ?? "").trim();
  const partyId = partyRaw && partyRaw !== "unsorted" ? Number(partyRaw) : null;

  if (files.length === 0) {
    return NextResponse.json({ error: "No files" }, { status: 400 });
  }

  if (partyId !== null) {
    const party = db.prepare("SELECT id FROM parties WHERE id = ?").get(partyId);
    if (!party) return NextResponse.json({ error: "Party not found" }, { status: 400 });
  }

  const uploaded: {
    id: number;
    src: string;
    alt: string;
    partyId: number | null;
    mediaType: "image" | "video";
  }[] = [];
  const failed: { name: string; error: string }[] = [];
  const insert = db.prepare(
    "INSERT INTO gallery (src, alt, party_id, media_type) VALUES (?, ?, ?, ?)"
  );

  for (const file of files) {
    if (file.size > MAX_SIZE) {
      failed.push({ name: file.name, error: "over 100MB" });
      continue;
    }
    if (!ALLOWED_MEDIA.has(file.type)) {
      failed.push({ name: file.name, error: "unsupported type" });
      continue;
    }
    const ext = extForMime(file.type);
    const name = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(UPLOADS_DIR, name), buf);
    const src = `/api/uploads/${name}`;
    const mediaType = isVideoMime(file.type) ? "video" : "image";
    const info = insert.run(src, alt, partyId, mediaType);
    uploaded.push({
      id: Number(info.lastInsertRowid),
      src,
      alt,
      partyId,
      mediaType,
    });
  }

  return NextResponse.json(
    { uploaded, failed },
    { status: uploaded.length ? 201 : 400 }
  );
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const partyId =
    body.partyId === null || body.partyId === "unsorted" || body.partyId === 0
      ? null
      : body.partyId
        ? Number(body.partyId)
        : undefined;
  if (partyId === undefined) {
    getDb().prepare("UPDATE gallery SET alt = ? WHERE id = ?").run(String(body.alt ?? ""), id);
  } else {
    getDb()
      .prepare("UPDATE gallery SET alt = ?, party_id = ? WHERE id = ?")
      .run(String(body.alt ?? ""), partyId, id);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const row = getDb()
    .prepare("SELECT src FROM gallery WHERE id = ?")
    .get(id) as { src: string } | undefined;
  if (row?.src.startsWith("/api/uploads/")) {
    fs.rmSync(path.join(UPLOADS_DIR, path.basename(row.src)), { force: true });
  }
  getDb().prepare("DELETE FROM gallery WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}

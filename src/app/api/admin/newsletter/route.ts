import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const db = getDb();
  const exists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='newsletter'")
    .get();
  if (!exists) return NextResponse.json([]);
  const rows = db
    .prepare("SELECT email, created_at FROM newsletter ORDER BY created_at DESC")
    .all() as { email: string; created_at: string }[];
  return NextResponse.json(
    rows.map((r) => ({ email: r.email, createdAt: r.created_at }))
  );
}

export async function DELETE(req: NextRequest) {
  const email = new URL(req.url).searchParams.get("email");
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });
  getDb().prepare("DELETE FROM newsletter WHERE email = ?").run(email);
  return NextResponse.json({ ok: true });
}

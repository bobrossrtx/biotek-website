import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, subject, recipients, created_at FROM sent_messages ORDER BY created_at DESC"
    )
    .all();
  return NextResponse.json(rows);
}

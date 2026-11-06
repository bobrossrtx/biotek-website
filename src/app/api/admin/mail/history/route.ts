import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, subject, recipients, created_at FROM sent_messages ORDER BY created_at DESC"
    )
    .all();
  return NextResponse.json(rows);
}

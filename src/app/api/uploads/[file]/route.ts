import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { UPLOADS_DIR } from "@/lib/db";
import { UPLOAD_SERVE_TYPES } from "@/lib/media";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { file: string } }
) {
  const name = path.basename(params.file);
  const ext = path.extname(name).toLowerCase();
  const type = UPLOAD_SERVE_TYPES[ext];
  if (!type) return new NextResponse("Not found", { status: 404 });

  const p = path.join(UPLOADS_DIR, name);
  if (!fs.existsSync(p)) return new NextResponse("Not found", { status: 404 });

  const buf = fs.readFileSync(p);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

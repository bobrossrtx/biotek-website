import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { UPLOADS_DIR } from "@/lib/db";
import { UPLOAD_SERVE_TYPES } from "@/lib/media";

export const runtime = "nodejs";

/**
 * Serves uploaded gallery media. Hardened per pentest H-2:
 * - X-Content-Type-Options: nosniff on everything
 * - inline only for raster/video types the browser renders safely;
 *   anything else (e.g. legacy SVG) is forced to download so embedded
 *   scripts in it never execute on our origin.
 */
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
  const inlineSafe = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime", "video/x-matroska"].includes(type);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `${inlineSafe ? "inline" : "attachment"}; filename="${name}"`,
    },
  });
}

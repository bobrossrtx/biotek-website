import { NextResponse } from "next/server";
import { getPartyPhotos } from "@/lib/content-db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  return NextResponse.json(getPartyPhotos(id));
}

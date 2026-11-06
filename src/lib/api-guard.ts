import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

/**
 * Per-route admin guard (defense-in-depth on top of middleware).
 * Middleware can behave differently under `next start` vs `next dev`,
 * so every /api/admin handler calls this first and returns its 401.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  if (await isAuthenticated()) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Reject oversized request bodies early (before buffering them).
 * Guards unauthenticated DoS via huge JSON/form payloads.
 */
export function bodyTooLarge(req: NextRequest, limitBytes = 1024 * 1024): boolean {
  const len = Number(req.headers.get("content-length") ?? "0");
  return Number.isFinite(len) && len > limitBytes;
}

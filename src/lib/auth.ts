import crypto from "node:crypto";
import { cookies } from "next/headers";

/**
 * Shared-password admin auth.
 *
 * Set these env vars (see .env.example):
 *   ADMIN_PASSWORD  - the shared crew password
 *   ADMIN_SECRET    - random string used to sign the session cookie
 *
 * The session cookie is HMAC-signed and expires after 7 days.
 */

export const SESSION_COOKIE = "biotek_admin";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function isAuthConfigured(): boolean {
  return !!process.env.ADMIN_PASSWORD && !!process.env.ADMIN_SECRET;
}

export function checkPassword(password: string): boolean {
  const expected = (process.env.ADMIN_PASSWORD ?? "").trim();
  const attempt = password.trim();
  if (!expected) return false;
  if (attempt.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(attempt), Buffer.from(expected));
  } catch {
    return false;
  }
}

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", process.env.ADMIN_SECRET ?? "insecure-dev-secret")
    .update(payload)
    .digest("hex");
}

export function createSessionToken(): string {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `admin.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [who, expires, sig] = parts;
  if (who !== "admin") return false;
  const expectedSig = sign(`${who}.${expires}`);
  try {
    if (
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))
    ) {
      return false;
    }
  } catch {
    return false;
  }
  return Number(expires) > Date.now();
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
};

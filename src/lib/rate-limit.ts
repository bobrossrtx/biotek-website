import { getDb } from "@/lib/db";

/**
 * SQLite-backed fixed-window rate limiter.
 * Survives process restarts (unlike in-memory maps) and works per-IP.
 * Intended as in-app backstop for brute force / email bombing; pair with
 * Cloudflare WAF rules for full coverage.
 */

const MAX_EVENTS = 10_000;

type HitRow = { window_start: number; count: number };

export class RateLimiter {
  private table: string;
  private max: number;
  private windowSec: number;

  /** max hits per windowSec per key; returns null when allowed */
  constructor(table: string, max: number, windowSec: number) {
    this.table = table;
    this.max = max;
    this.windowSec = windowSec;
    getDb()
      .exec(`
        CREATE TABLE IF NOT EXISTS ${this.table} (
          key TEXT PRIMARY KEY,
          window_start INTEGER NOT NULL,
          count INTEGER NOT NULL
        );
      `);
  }

  /** Record a hit. Returns seconds until the window resets if over limit, else null. */
  hit(key: string, cost = 1): number | null {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    const windowStart = Math.floor(now / this.windowSec) * this.windowSec;
    const row = db
      .prepare(`SELECT window_start, count FROM ${this.table} WHERE key = ?`)
      .get(key) as HitRow | undefined;
    const sameWindow = row && row.window_start === windowStart;
    const count = sameWindow ? row.count : 0;
    if (count + cost > this.max) {
      return sameWindow ? row.window_start + this.windowSec - now : this.windowSec;
    }
    db.prepare(
      `INSERT INTO ${this.table} (key, window_start, count) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET window_start = excluded.window_start, count = excluded.count`
    ).run(key, windowStart, count + cost);
    return null;
  }

  /** Successful auth clears the counter (e.g. after a correct password). */
  reset(key: string): void {
    getDb().prepare(`DELETE FROM ${this.table} WHERE key = ?`).run(key);
  }

  prune(): void {
    const cutoff = Math.floor(Date.now() / 1000) - 2 * 24 * 3600;
    getDb().prepare(`DELETE FROM ${this.table} WHERE window_start < ?`).run(cutoff);
  }
}

export const loginRateLimiter = new RateLimiter("rl_admin_login", 5, 5 * 60);
export const publicPostRateLimiter = new RateLimiter("rl_public_post", 5, 60);
export const newsletterRateLimiter = new RateLimiter("rl_newsletter", 3, 60 * 60);

// occasional cleanup — cheap, idempotent, run on each limiter construction
let pruned = false;
export function pruneRateLimiters(): void {
  if (pruned) return;
  pruned = true;
  for (const l of [loginRateLimiter, publicPostRateLimiter, newsletterRateLimiter]) l.prune();
  const db = getDb();
  for (const t of ["rl_admin_login", "rl_public_post", "rl_newsletter"]) {
    const c = db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get() as { c: number };
    if (c.c > MAX_EVENTS) db.exec(`DELETE FROM ${t} WHERE key NOT IN (SELECT key FROM ${t} LIMIT ${MAX_EVENTS})`);
  }
}

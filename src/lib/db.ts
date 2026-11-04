import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import crypto from "node:crypto";

/**
 * SQLite storage. One file on disk, created + seeded on first use.
 * Content lives in tables; the admin console writes here and the public
 * pages read from here.
 *
 * Separate dev and production databases so testing never touches live data:
 *   - `npm run dev`      -> data/dev/   (NODE_ENV=development)
 *   - `npm run build/start` -> data/prod/
 * Override both with the DATA_DIR env var (e.g. a mounted volume).
 */

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(
      process.cwd(),
      "data",
      process.env.NODE_ENV === "production" ? "prod" : "dev"
    );

export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const DB_PATH = path.join(DATA_DIR, "biotek.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      doors TEXT DEFAULT '',
      venue TEXT DEFAULT '',
      city TEXT DEFAULT '',
      address TEXT DEFAULT '',
      lineup TEXT DEFAULT '[]',
      price TEXT DEFAULT '',
      ticket_url TEXT DEFAULT '',
      rsvp_url TEXT DEFAULT '',
      featured INTEGER DEFAULT 0,
      past INTEGER DEFAULT 0,
      past_gallery TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gallery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      src TEXT NOT NULL,
      alt TEXT DEFAULT '',
      media_type TEXT NOT NULL DEFAULT 'image',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS parties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT DEFAULT '',
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- gallery.party_id is added by the PRAGMA-based migration below
    -- (ALTER TABLE would fail on databases that already have it)

    CREATE TABLE IF NOT EXISTS mixes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT DEFAULT '',
      platform TEXT NOT NULL DEFAULT 'soundcloud',
      embed_url TEXT NOT NULL,
      play_url TEXT DEFAULT '',
      featured INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      event_date TEXT DEFAULT '',
      location TEXT DEFAULT '',
      event_type TEXT DEFAULT '',
      message TEXT DEFAULT '',
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sent_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      recipients INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      direction TEXT NOT NULL CHECK (direction IN ('out','in')),
      from_addr TEXT NOT NULL,
      to_addr TEXT NOT NULL,
      subject TEXT DEFAULT '',
      body TEXT NOT NULL,
      provider_id TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_email_messages_booking
      ON email_messages (booking_id, created_at);
  `);

  // migrations for pre-existing DBs — add columns if missing
  const cols = (
    db.prepare("PRAGMA table_info(gallery)").all() as { name: string }[]
  ).map((c) => c.name);
  if (!cols.includes("party_id")) {
    db.exec(
      "ALTER TABLE gallery ADD COLUMN party_id INTEGER REFERENCES parties(id) ON DELETE CASCADE"
    );
  }
  if (!cols.includes("media_type")) {
    db.exec("ALTER TABLE gallery ADD COLUMN media_type TEXT NOT NULL DEFAULT 'image'");
  }

  const eventCols = (
    db.prepare("PRAGMA table_info(events)").all() as { name: string }[]
  ).map((c) => c.name);
  if (!eventCols.includes("address")) {
    db.exec("ALTER TABLE events ADD COLUMN address TEXT DEFAULT ''");
  }

  // newsletter table may predate unsubscribe support
  const nlTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='newsletter'")
    .get();
  if (nlTable) {
    const nlCols = (
      db.prepare("PRAGMA table_info(newsletter)").all() as { name: string }[]
    ).map((c) => c.name);
    if (!nlCols.includes("unsubscribe_token")) {
      db.exec("ALTER TABLE newsletter ADD COLUMN unsubscribe_token TEXT NOT NULL DEFAULT ''");
    }
    if (!nlCols.includes("unsubscribed")) {
      db.exec("ALTER TABLE newsletter ADD COLUMN unsubscribed INTEGER NOT NULL DEFAULT 0");
    }
    // backfill tokens for existing rows
    const missing = db
      .prepare("SELECT email FROM newsletter WHERE unsubscribe_token = ''")
      .all() as { email: string }[];
    const upd = db.prepare(
      "UPDATE newsletter SET unsubscribe_token = ? WHERE email = ?"
    );
    for (const row of missing) {
      upd.run(randomToken(), row.email);
    }
  }

  const count = db.prepare("SELECT COUNT(*) AS c FROM events").get() as {
    c: number;
  };
  if (count.c === 0) seed(db);
}

function seed(db: Database.Database) {
  // Fresh installs start empty — events, gallery and music are added via
  // the admin console at /admin/console.
  void db;
}

export function randomToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

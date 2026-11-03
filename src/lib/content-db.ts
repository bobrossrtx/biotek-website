import { getDb } from "@/lib/db";

export type UpcomingEvent = {
  id: number;
  title: string;
  date: string;
  doors: string;
  venue: string;
  city: string;
  address: string;
  lineup: string[];
  price: string;
  ticketUrl: string;
  rsvpUrl: string;
  featured: boolean;
};

export type PastEvent = {
  id: number;
  title: string;
  date: string;
  venue: string;
  city: string;
  address: string;
  lineup: string[];
  pastGallery: string;
};

type EventRow = {
  id: number;
  title: string;
  date: string;
  doors: string;
  venue: string;
  city: string;
  address: string;
  lineup: string;
  price: string;
  ticket_url: string;
  rsvp_url: string;
  featured: number;
  past: number;
  past_gallery: string;
};

function toUpcoming(r: EventRow): UpcomingEvent {
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    doors: r.doors,
    venue: r.venue,
    city: r.city,
    address: r.address,
    lineup: JSON.parse(r.lineup || "[]"),
    price: r.price,
    ticketUrl: r.ticket_url,
    rsvpUrl: r.rsvp_url,
    featured: !!r.featured,
  };
}

function toPast(r: EventRow): PastEvent {
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    venue: r.venue,
    city: r.city,
    address: r.address,
    lineup: JSON.parse(r.lineup || "[]"),
    pastGallery: r.past_gallery,
  };
}

export function getUpcomingEvents(): UpcomingEvent[] {
  const rows = getDb()
    .prepare("SELECT * FROM events WHERE past = 0 ORDER BY date ASC")
    .all() as EventRow[];
  return rows.map(toUpcoming);
}

export function getNextEvent(): UpcomingEvent | null {
  const today = new Date().toISOString().slice(0, 10);
  return getUpcomingEvents().find((e) => e.date >= today) ?? null;
}

export function getPastEvents(): PastEvent[] {
  const rows = getDb()
    .prepare("SELECT * FROM events WHERE past = 1 ORDER BY date DESC")
    .all() as EventRow[];
  return rows.map(toPast);
}

export type Mix = {
  id: number;
  title: string;
  date: string;
  description: string;
  platform: "soundcloud" | "mixcloud" | "bandcamp";
  embedUrl: string;
  playUrl: string;
  featured: boolean;
};

type MixRow = {
  id: number;
  title: string;
  date: string;
  description: string;
  platform: string;
  embed_url: string;
  play_url: string;
  featured: number;
};

export function getMixes(): Mix[] {
  const rows = getDb()
    .prepare("SELECT * FROM mixes ORDER BY date DESC")
    .all() as MixRow[];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    date: r.date,
    description: r.description,
    platform: (["soundcloud", "mixcloud", "bandcamp"].includes(r.platform)
      ? r.platform
      : "soundcloud") as Mix["platform"],
    embedUrl: r.embed_url,
    playUrl: r.play_url,
    featured: !!r.featured,
  }));
}

export function getFeaturedMix(): Mix | null {
  const db = getDb();
  const f = db.prepare("SELECT * FROM mixes WHERE featured = 1 LIMIT 1").get() as
    | MixRow
    | undefined;
  if (f) return getMixes().find((m) => m.id === f.id) ?? null;
  return getMixes()[0] ?? null;
}

export type GalleryItem = {
  id: number;
  src: string;
  alt: string;
  mediaType: "image" | "video";
};

export function getGallery(): GalleryItem[] {
  return getDb()
    .prepare("SELECT id, src, alt, media_type AS mediaType FROM gallery ORDER BY created_at DESC, id DESC")
    .all() as GalleryItem[];
}

export type PartyFolder = {
  id: number;
  name: string;
  date: string;
  description: string;
  photoCount: number;
  cover: string | null;
};

export function getPartyFolders(): PartyFolder[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.id, p.name, p.date, p.description, COUNT(g.id) AS photo_count
       FROM parties p LEFT JOIN gallery g ON g.party_id = p.id
       GROUP BY p.id ORDER BY p.date DESC, p.id DESC`
    )
    .all() as { id: number; name: string; date: string; description: string; photo_count: number }[];
  return rows.map((r) => {
    const cover = (db
      .prepare(
        "SELECT src FROM gallery WHERE party_id = ? AND media_type = 'image' ORDER BY created_at ASC, id ASC LIMIT 1"
      )
      .get(r.id) ??
      db
        .prepare(
          "SELECT src FROM gallery WHERE party_id = ? ORDER BY created_at ASC, id ASC LIMIT 1"
        )
        .get(r.id)) as { src: string } | undefined;
    return {
      id: r.id,
      name: r.name,
      date: r.date,
      description: r.description,
      photoCount: r.photo_count,
      cover: cover?.src ?? null,
    };
  });
}

export function getPartyPhotos(partyId: number): GalleryItem[] {
  return getDb()
    .prepare(
      "SELECT id, src, alt, media_type AS mediaType FROM gallery WHERE party_id = ? ORDER BY created_at ASC, id ASC"
    )
    .all(partyId) as GalleryItem[];
}

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso + "T12:00:00").toLocaleDateString(
    "en-GB",
    opts ?? { day: "numeric", month: "short", year: "numeric" }
  );
}

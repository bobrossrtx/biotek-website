import site from "@/content/site.json";
import about from "@/content/about.json";
import events from "@/content/events.json";
import mixes from "@/content/mixes.json";
import gallery from "@/content/gallery.json";

export { site, about, events, mixes, gallery };

export type RigSpec = { label: string; value: string };

export type Role = { role: string; description: string };

export type UpcomingEvent = {
  title: string;
  date: string; // ISO yyyy-mm-dd
  doors: string;
  venue: string;
  city: string;
  lineup: string[];
  price: string;
  ticketUrl?: string;
  rsvpUrl?: string;
  featured?: boolean;
};

export type PastEvent = {
  title: string;
  date: string;
  venue: string;
  city: string;
  lineup: string[];
  gallery?: string;
};

export type Mix = {
  id: string;
  title: string;
  date: string;
  description: string;
  platform: "soundcloud" | "mixcloud" | "bandcamp";
  embedUrl: string;
  playUrl: string;
};

export type GalleryItem = { src: string; alt: string };

export function getRigSpecs(): RigSpec[] {
  return about.rig.specs as RigSpec[];
}

export function getRoles(): Role[] {
  return about.collective.roles as Role[];
}

export function getUpcomingEvents(): UpcomingEvent[] {
  return [...(events.upcoming as UpcomingEvent[])].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

export function getNextEvent(): UpcomingEvent | null {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = getUpcomingEvents().filter((e) => e.date >= today);
  return upcoming[0] ?? null;
}

export function getPastEvents(): PastEvent[] {
  return [...(events.past as PastEvent[])].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
}

export function getMixes(): Mix[] {
  return [...(mixes.mixes as Mix[])].sort((a, b) => b.date.localeCompare(a.date));
}

export function getFeaturedMix(): Mix | null {
  const f = getMixes().find((m) => m.id === mixes.featured);
  return f ?? getMixes()[0] ?? null;
}

export function getGallery(): GalleryItem[] {
  return gallery.items as GalleryItem[];
}

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso + "T12:00:00").toLocaleDateString(
    "en-GB",
    opts ?? { day: "numeric", month: "short", year: "numeric" }
  );
}

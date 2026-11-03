"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EventsTab from "./EventsTab";
import GalleryTab from "./GalleryTab";
import MusicTab from "./MusicTab";
import BookingsTab from "./BookingsTab";
import MailTab from "./MailTab";

type Tab = "events" | "gallery" | "music" | "bookings" | "mail";

const TABS: { id: Tab; label: string }[] = [
  { id: "events", label: "Events" },
  { id: "gallery", label: "Gallery" },
  { id: "music", label: "Music" },
  { id: "bookings", label: "Bookings" },
  { id: "mail", label: "Mail" },
];

export default function Console() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("events");

  const logout = useCallback(async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin");
    router.refresh();
  }, [router]);

  return (
    <div className="admin-console">
      <header className="admin-header">
        <div className="wrap admin-header__inner">
          <p className="section-kicker">{"// BioTek CMS"}</p>
          <button type="button" className="btn btn--ghost admin-logout" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <nav className="admin-tabs wrap" aria-label="Console sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`admin-tab ${tab === t.id ? "is-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="wrap admin-main">
        {tab === "events" && <EventsTab />}
        {tab === "gallery" && <GalleryTab />}
        {tab === "music" && <MusicTab />}
        {tab === "bookings" && <BookingsTab />}
        {tab === "mail" && <MailTab />}
      </main>
    </div>
  );
}

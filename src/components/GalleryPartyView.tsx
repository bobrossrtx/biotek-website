"use client";

import { useState } from "react";
import Lightbox from "@/components/Lightbox";
import type { GalleryItem, PartyFolder } from "@/lib/content-db";

/**
 * Public gallery organised by party folders.
 * Party cards → click to expand that party's photo grid + lightbox.
 */
export default function GalleryPartyView({ parties }: { parties: PartyFolder[] }) {
  const [openParty, setOpenParty] = useState<number | null>(null);
  const [photos, setPhotos] = useState<Record<number, GalleryItem[]>>({});
  const [loading, setLoading] = useState<number | null>(null);

  async function toggle(partyId: number) {
    if (openParty === partyId) {
      setOpenParty(null);
      return;
    }
    setOpenParty(partyId);
    if (!photos[partyId]) {
      setLoading(partyId);
      const res = await fetch(`/api/parties/${partyId}/photos`);
      if (res.ok) {
        const data = await res.json();
        setPhotos((prev) => ({ ...prev, [partyId]: data }));
      }
      setLoading(null);
    }
  }

  return (
    <div>
      <ul className="party-folders">
        {parties.map((party, i) => (
          <li key={party.id}>
            <button
              type="button"
              className={`party-folder ${openParty === party.id ? "is-open" : ""}`}
              onClick={() => toggle(party.id)}
              aria-expanded={openParty === party.id}
            >
              <span className="party-folder__cover">
                {party.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element -- dynamic uploaded images
                  <img src={party.cover} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="party-folder__empty" aria-hidden="true" />
                )}
                <span className="party-folder__count">{party.photoCount}</span>
              </span>
              <span className="party-folder__meta">
                <span className="party-folder__name">{party.name}</span>
                {party.date && (
                  <span className="party-folder__date">
                    {new Date(party.date + "T12:00:00").toLocaleDateString("en-GB", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                )}
                <span className="party-folder__hint">
                  {openParty === party.id ? "Close ↑" : `${party.photoCount} photos →`}
                </span>
              </span>
            </button>

            {openParty === party.id && (
              <div className="party-photos">
                {loading === party.id && <p className="lead">Loading photos…</p>}
                {photos[party.id] && photos[party.id].length > 0 && (
                  <Lightbox items={photos[party.id]} />
                )}
                {photos[party.id] && photos[party.id].length === 0 && (
                  <p className="lead">No photos in this folder yet.</p>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { Mix } from "@/lib/content-db";

const PLATFORM_LABEL: Record<Mix["platform"], string> = {
  soundcloud: "SoundCloud",
  mixcloud: "Mixcloud",
  bandcamp: "Bandcamp",
};

/**
 * Click-to-load facade: renders a lightweight placeholder card and only
 * injects the platform iframe after user intent. Keeps pages fast — no
 * third-party JS loads until someone presses play.
 */
export default function MixEmbed({ mix, featured = false }: { mix: Mix; featured?: boolean }) {
  const [active, setActive] = useState(false);

  return (
    <article className={`mix-card card ${featured ? "mix-card--featured" : ""}`}>
      <div className="mix-card__head">
        <span className="mono-label">{PLATFORM_LABEL[mix.platform]}</span>
        <span className="mono-label">{mix.date}</span>
      </div>
      <h3 className="mix-card__title">{mix.title}</h3>
      <p className="mix-card__desc">{mix.description}</p>

      {active ? (
        <div className="mix-card__player">
          <iframe
            src={mix.embedUrl}
            title={`Play ${mix.title}`}
            allow="autoplay"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="mix-card__facade">
          <div className="mix-card__wave" aria-hidden="true">
            {Array.from({ length: 36 }, (_, i) => (
              <span
                key={i}
                style={{ "--bar-h": `${18 + ((i * 53) % 70)}%` } as React.CSSProperties}
              />
            ))}
          </div>
          <div className="mix-card__actions">
            <button
              type="button"
              className="btn"
              onClick={() => setActive(true)}
              aria-label={`Load the ${PLATFORM_LABEL[mix.platform]} player for ${mix.title}`}
            >
              ▶ Play
            </button>
            <a
              className="btn btn--ghost"
              href={mix.playUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open on {PLATFORM_LABEL[mix.platform]} ↗
            </a>
          </div>
        </div>
      )}
    </article>
  );
}

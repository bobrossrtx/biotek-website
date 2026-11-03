import Link from "next/link";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import MixEmbed from "@/components/MixEmbed";
import BioCanvas from "@/components/BioCanvas";
import { UpcomingEventCard } from "@/components/EventCard";
import { getFeaturedMix, getGallery, getNextEvent } from "@/lib/content-db";
import { site } from "@/lib/content";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const nextEvent = getNextEvent();
  const featuredMix = getFeaturedMix();
  const galleryPreview = getGallery().slice(0, 4).map((g) => g.src);

  return (
    <>
      <section className="hero" aria-labelledby="hero-heading">
        <BioCanvas />
        <div className="hero__inner wrap">
          <h1 id="hero-heading" className="hero__title">
            <Image
              src="/images/biotek-logo-green.png"
              alt="BioTek"
              width={1254}
              height={1254}
              priority
              className="hero__logo"
            />
            <span className="visually-hidden">BioTek Sound System</span>
          </h1>
          <p className="mono-label hero__kicker">
            UK | South Eastern Collective &amp; SoundSystem
          </p>

          {nextEvent && (
            <Link
              href="/events/"
              className="hero__next card"
              aria-label={`Next event: ${nextEvent.title}, ${nextEvent.venue} — tickets and all events`}
            >
              <span className="mono-label hero__next-label">{site.nextEventLabel}</span>
              <span className="hero__next-title">{nextEvent.title}</span>
              <span className="hero__next-meta">
                {new Date(nextEvent.date + "T12:00:00").toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}{" "}
                · {nextEvent.venue}
              </span>
            </Link>
          )}

          <div className="hero__actions">
            <Link href="/events/" className="btn">
              Tickets & dates
            </Link>
            <Link href="/gallery/" className="btn btn--ghost">
              View the Archive
            </Link>
          </div>
        </div>
        <p className="hero__scroll mono-label" aria-hidden="true">
          scroll ↓
        </p>
      </section>

      <section className="section" aria-labelledby="intro-heading">
        <div className="wrap">
          <Reveal>
            <p className="section-kicker">{"// Who dis"}</p>
            <h2 id="intro-heading" className="section-title">
              {"ACAB "}
              <span className="accent">{"//"}</span>
              {" BASS "}
              <span className="accent">{"\\\\"}</span>
              {" PLUR"}
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="lead section-sub">
              We are BioTek, a South East collective and soundsystem.
              Multigenre by nature — jungle, tekno, garage, drum &amp; bass,
              whatever the night calls for. Good vibes only: no egos, no
              attitude, everyone looks after each other. We do it to keep the
              scene alive in the South East.
            </p>
          </Reveal>
          <Reveal delay={180}>
            <div className="home-links">
              <Link href="/gallery/" className="text-link">
                Photo Archive →
              </Link>
              <Link href="/about/" className="text-link">
                About the crew &amp; rig →
              </Link>
            </div>
          </Reveal>
          <Reveal delay={240}>
            <p className="mono-label home-photo-note">
              Spotted yourself in a photo? Email{" "}
              <a href={`mailto:${site.email}`}>{site.email}</a> and
              we&apos;ll blur your face or remove the shot — no questions.
            </p>
          </Reveal>
        </div>
      </section>

      {nextEvent && (
        <section className="section section--alt" aria-labelledby="events-heading">
          <div className="wrap">
            <Reveal>
              <div className="section-head">
                <div>
                  <p className="section-kicker">{"// Get tickets"}</p>
                  <h2 id="events-heading" className="section-title">
                    Next Event
                  </h2>
                </div>
                <Link href="/events/" className="text-link">
                  All events →
                </Link>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <UpcomingEventCard event={nextEvent} />
            </Reveal>
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="gallery-heading">
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <div>
                <p className="section-kicker">{"// From the last party"}</p>
                <h2 id="gallery-heading" className="section-title">
                  Photography
                </h2>
              </div>
              <Link href="/gallery/" className="text-link">
                Full gallery →
              </Link>
            </div>
          </Reveal>
          <Reveal delay={120}>
            {galleryPreview.length > 0 ? (
              <div className="home-gallery">
                {galleryPreview.map((src, i) => (
                  <Link key={src} href="/gallery/" className="home-gallery__item" aria-label={`View photo ${i + 1} in the gallery`}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- small static teaser tiles */}
                    <img src={src} alt="" loading="lazy" decoding="async" width={1600} height={1000} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="lead section-sub">
                No photos up yet — the archive opens after the next party.
              </p>
            )}
          </Reveal>
        </div>
      </section>

      {featuredMix && (
        <section className="section section--alt" aria-labelledby="mix-heading">
          <div className="wrap">
            <Reveal>
              <div className="section-head">
                <div>
                  <p className="section-kicker">{"// Featured sets"}</p>
                  <h2 id="mix-heading" className="section-title">
                    Recently Recorded Sets
                  </h2>
                </div>
                <Link href="/music/" className="text-link">
                  All sets →
                </Link>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="home-mix">
                <MixEmbed mix={featuredMix} featured />
              </div>
            </Reveal>
          </div>
        </section>
      )}
    </>
  );
}

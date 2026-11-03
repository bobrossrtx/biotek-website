import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import { UpcomingEventCard, PastEventRow } from "@/components/EventCard";
import { getPastEvents, getUpcomingEvents } from "@/lib/content-db";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Events",
  description:
    "Upcoming BioTek free parties and raves — dates, lineups and tickets. Locations released close to the event, East Sussex and beyond.",
  path: "/events/",
});

export default function EventsPage() {
  const upcoming = getUpcomingEvents();
  const past = getPastEvents();
  const today = new Date().toISOString().slice(0, 10);
  const live = upcoming.filter((e) => e.date >= today);
  const archived = upcoming.filter((e) => e.date < today);

  const eventJsonLd = live.map((e) => ({
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.title,
    startDate: e.date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: e.venue,
      address: e.city,
    },
    organizer: { "@type": "Organization", name: "BioTek Sound System" },
  }));

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <p className="section-kicker">{"// Diary"}</p>
          <h1 className="display-xl">EVENTS</h1>
          <p className="lead section-sub">
            Dates go up when they&apos;re locked. Locations are released close
            to the event through relevant private networks — check the ticket
            link or our socials on the day. Tickets in advance where shown.
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="upcoming-heading">
        <div className="wrap">
          <Reveal>
            <div className="section-head">
            <div>
              <p className="section-kicker">{"// Forward"}</p>
              <h2 id="upcoming-heading" className="section-title">
                Upcoming raves
              </h2>
            </div>
            </div>
          </Reveal>

          {live.length === 0 && (
            <Reveal>
              <p className="lead">
                Nothing on the board right now — the next party is being
                plotted. Check back soon or join the mailing list in the footer.
              </p>
            </Reveal>
          )}

          {live.map((event, i) => (
            <Reveal key={event.title + event.date} delay={i * 80}>
              <UpcomingEventCard event={event} />
            </Reveal>
          ))}

          {archived.length > 0 && (
            <>
              <Reveal>
                <p className="mono-label" style={{ margin: "2rem 0 0.8rem" }}>
                  {"// Recently passed"}
                </p>
              </Reveal>
              {archived.map((event) => (
                <UpcomingEventCard key={event.title + event.date} event={event} />
              ))}
            </>
          )}
        </div>
      </section>

      {past.length > 0 && (
        <section className="section section--alt" aria-labelledby="archive-heading">
          <div className="wrap">
            <Reveal>
              <div className="section-head">
                <div>
                  <p className="section-kicker">{"// Archive"}</p>
                  <h2 id="archive-heading" className="section-title">
                    Past raves
                  </h2>
                </div>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <ul className="past-list">
                {past.map((event) => (
                  <PastEventRow key={event.title + event.date} event={event} />
                ))}
              </ul>
            </Reveal>
          </div>
        </section>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />
    </>
  );
}

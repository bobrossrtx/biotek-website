import { formatDate, type UpcomingEvent, type PastEvent } from "@/lib/content-db";

function dateBits(iso: string) {
  const d = new Date(iso + "T12:00:00");
  const day = d.toLocaleDateString("en-GB", { day: "2-digit" });
  const mon = d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
  const yr = d.getFullYear();
  return { day, mon, yr };
}

export function UpcomingEventCard({ event }: { event: UpcomingEvent }) {
  const { day, mon, yr } = dateBits(event.date);
  return (
    <article className="event-card">
      <div className="event-card__date" aria-hidden="true">
        <span className="event-card__day">{day}</span>
        <span className="event-card__mon">{mon}</span>
        <span className="event-card__yr">{yr}</span>
      </div>
      <div className="event-card__body">
        <h3 className="event-card__title">
          <span className="visually-hidden">
            {formatDate(event.date)} —{" "}
          </span>
          {event.title}
        </h3>
        <p className="event-card__venue">
          {event.venue}
          {event.city ? ` · ${event.city}` : ""} · Doors {event.doors}
        </p>
        {event.address && (
          <p className="event-card__address">
            <span className="mono-label">Address:</span> {event.address}
          </p>
        )}
        <ul className="event-card__lineup" aria-label="Lineup">
          {event.lineup.map((l) => (
            <li key={l} className="chip">
              {l}
            </li>
          ))}
        </ul>
        <div className="event-card__meta">
          <span className="event-card__price">{event.price}</span>
          {event.ticketUrl && (
            <a className="btn" href={event.ticketUrl}>
              Tickets
            </a>
          )}
          {!event.ticketUrl && event.rsvpUrl && (
            <a className="btn btn--ghost" href={event.rsvpUrl}>
              RSVP
            </a>
          )}
          {!event.ticketUrl && !event.rsvpUrl && (
            <span className="mono-label">Tickets on the door</span>
          )}
        </div>
      </div>
    </article>
  );
}

export function PastEventRow({ event }: { event: PastEvent }) {
  return (
    <li className="past-row">
      <span className="past-row__date">{formatDate(event.date)}</span>
      <span className="past-row__title">{event.title}</span>
      <span className="past-row__venue">
        {event.venue}, {event.city}
      </span>
      {event.pastGallery ? (
        <a className="past-row__link" href={event.pastGallery}>
          Photos ↗
        </a>
      ) : (
        <span className="past-row__link past-row__link--none" aria-hidden="true" />
      )}
    </li>
  );
}

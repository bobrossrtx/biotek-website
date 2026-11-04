import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import BookingForm from "@/components/BookingForm";
import { site } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Booking",
  description:
    "Book BioTek sound system for free parties, festivals and raves — or get in touch about tickets and locations. East Sussex based, multigenre.",
  path: "/booking/",
});

export default function BookingPage() {
  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <p className="section-kicker">{"// Get in touch"}</p>
          <h1 className="display-xl">BOOKING</h1>
          <p className="lead section-sub">
            Booking the rig, joining a party, or something else — tell us the
            date, the place and what you&apos;ve got in mind. We&apos;ll come
            back with availability and details. Discretion guaranteed: we
            don&apos;t share locations or names.
          </p>
        </div>
      </section>

      <section className="section" aria-label="Contact form">
        <div className="wrap booking-layout">
          <Reveal>
            <div className="booking-aside">
              <div className="card booking-aside__card">
                <p className="mono-label">{"// Direct"}</p>
                <p>
                  Prefer email? Reach us at{" "}
                  <a className="text-link" href={`mailto:${site.email}`}>
                    {site.email}
                  </a>
                </p>
              </div>
              <div className="card booking-aside__card">
                <p className="mono-label">{"// We bring"}</p>
                <ul className="booking-brings">
                  <li>Speaker bins + amps, growing all the time</li>
                  <li>Mains power required (no generator)</li>
                  <li>Multigenre residents & DJs</li>
                  <li>Full tech details on request</li>
                </ul>
              </div>
              <div className="card booking-aside__card">
                <p className="mono-label">{"// Tickets"}</p>
                <p>
                  Ticket questions? Use the form with the event date and
                  we&apos;ll sort you out.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <BookingForm />
          </Reveal>
        </div>
      </section>
    </>
  );
}

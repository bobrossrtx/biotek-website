import Link from "next/link";
import Image from "next/image";
import { site } from "@/lib/content";
import NewsletterForm from "./NewsletterForm";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__grid">
        <div className="site-footer__brand">
          <Image
            src="/images/biotek-logo.png"
            alt="BioTek logo"
            width={1254}
            height={1254}
            className="footer-logo"
          />
          <p className="site-footer__tag">{site.tagline}</p>
          <p className="mono-label">{site.location}</p>
        </div>

        <nav aria-label="Footer navigation" className="site-footer__nav">
          <p className="mono-label">Site</p>
          <ul>
            <li><Link href="/about/">About</Link></li>
            <li><Link href="/events/">Events</Link></li>
            <li><Link href="/music/">Music</Link></li>
            <li><Link href="/gallery/">Gallery</Link></li>
            <li><Link href="/booking/">Booking</Link></li>
          </ul>
        </nav>

        <div className="site-footer__social">
          <p className="mono-label">Elsewhere</p>
          <ul>
            {site.social.map((s) => (
              <li key={s.label}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.label} <span aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="site-footer__news">
          <p className="mono-label">Signal</p>
          <p className="site-footer__news-copy">
            Get early information about our upcoming legal events.
          </p>
          <NewsletterForm />
        </div>
      </div>

      <div className="wrap site-footer__legal">
        <p>
          © {year} {site.name}. Built loud.
        </p>
        <p className="mono-label">
          <a href={`mailto:${site.email}`}>{site.email}</a>
        </p>
      </div>
    </footer>
  );
}
